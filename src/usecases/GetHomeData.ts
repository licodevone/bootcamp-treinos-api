import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

const DAY_INDEX_TO_WEEK_DAY: Record<number, WeekDay> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

interface InputDto {
  userId: string;
  date: string; // YYYY-MM-DD
}

interface OutputDto {
  activeWorkoutPlanId: string;
  todayWorkoutDay: {
    workoutPlanId: string;
    id: string;
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    estimatedDurationInSeconds: number;
    coverImageUrl?: string;
    exercisesCount: number;
  };
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
}

export class GetHomeData {
  async execute(dto: InputDto): Promise<OutputDto> {
    const currentDate = dayjs.utc(dto.date);
    const currentWeekDay = DAY_INDEX_TO_WEEK_DAY[currentDate.day()];

    // 1) Buscar o workout plan ativo do usuário
    const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          include: {
            exercises: true,
            sessions: true,
          },
        },
      },
    });

    if (!activeWorkoutPlan) {
      throw new NotFoundError("Active workout plan not found");
    }

    // 2) Encontrar o dia de treino correspondente ao dia da semana atual
    const todayWorkoutDay = activeWorkoutPlan.workoutDays.find(
      (day) => day.weekDay === currentWeekDay,
    );

    if (!todayWorkoutDay) {
      throw new NotFoundError("Workout day not found for today");
    }

    // 3) Calcular o range da semana (domingo a sábado) em UTC
    const weekStart = currentDate.startOf("week"); // domingo 00:00:00
    const weekEnd = currentDate.endOf("week"); // sábado 23:59:59

    // 4) Buscar todas as WorkoutSessions do usuário no range da semana
    const workoutDayIds = activeWorkoutPlan.workoutDays.map((day) => day.id);

    const weekSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDayId: { in: workoutDayIds },
        startedAt: {
          gte: weekStart.toDate(),
          lte: weekEnd.toDate(),
        },
      },
    });

    // 5) Montar consistencyByDay — incluir TODOS os dias da semana
    const consistencyByDay: OutputDto["consistencyByDay"] = {};

    for (let i = 0; i < 7; i++) {
      const day = weekStart.add(i, "day");
      const dayKey = day.format("YYYY-MM-DD");

      const daySessions = weekSessions.filter(
        (session) =>
          dayjs.utc(session.startedAt).format("YYYY-MM-DD") === dayKey,
      );

      const workoutDayStarted = daySessions.length > 0;
      const workoutDayCompleted = daySessions.some(
        (session) => session.completedAt !== null,
      );

      consistencyByDay[dayKey] = {
        workoutDayCompleted,
        workoutDayStarted,
      };
    }

    // 6) Calcular workoutStreak
    const workoutStreak = this.calculateStreak(dto.userId, activeWorkoutPlan);

    return {
      activeWorkoutPlanId: activeWorkoutPlan.id,
      todayWorkoutDay: {
        workoutPlanId: activeWorkoutPlan.id,
        id: todayWorkoutDay.id,
        name: todayWorkoutDay.name,
        isRest: todayWorkoutDay.isRest,
        weekDay: todayWorkoutDay.weekDay,
        estimatedDurationInSeconds: todayWorkoutDay.estimatedDurationInSeconds,
        ...(todayWorkoutDay.coverImageUrl && {
          coverImageUrl: todayWorkoutDay.coverImageUrl,
        }),
        exercisesCount: todayWorkoutDay.exercises.length,
      },
      workoutStreak,
      consistencyByDay,
    };
  }

  private calculateStreak(
    userId: string,
    activeWorkoutPlan: {
      workoutDays: Array<{
        id: string;
        weekDay: WeekDay;
        isRest: boolean;
        sessions: Array<{
          completedAt: Date | null;
          startedAt: Date;
        }>;
      }>;
    },
  ): number {
    // Mapear os dias de treino que possuem sessão completada ou são dia de descanso
    // Streak = dias consecutivos no plano onde o usuário completou (incluindo descanso)
    const weekDayOrder: WeekDay[] = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ];

    // Filtrar apenas os dias que existem no plano, na ordem da semana
    const planDays = weekDayOrder
      .map((wd) => activeWorkoutPlan.workoutDays.find((d) => d.weekDay === wd))
      .filter((d) => d !== undefined);

    let streak = 0;

    // Contar de trás para frente os dias consecutivos completados
    for (let i = planDays.length - 1; i >= 0; i--) {
      const day = planDays[i];

      if (day.isRest) {
        streak++;
        continue;
      }

      const hasCompletedSession = day.sessions.some(
        (session) => session.completedAt !== null,
      );

      if (hasCompletedSession) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
