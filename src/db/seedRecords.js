/**
 * Seed data derived from Irrigation_Schedule_02.xlsx
 * Programs ordered by controller program letter (A, B, C, D).
 */
export const SEED_RECORDS = [
  {
    controller_program: "A",
    name: "Fnt-Crt-Star",
    description: "Front, Court, and Star Jasmine",
    zones: [
      {
        valve: 1,
        name: "Front",
        schedules: [
          { start_time: "04:30", duration_minutes: 30, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 1, notes: "1st cycle" },
          { start_time: "07:30", duration_minutes: 30, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 2, notes: "2nd cycle – soak" },
        ],
      },
      {
        valve: 5,
        name: "Court",
        schedules: [
          { start_time: "05:00", duration_minutes: 15, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 1, notes: "1st cycle" },
          { start_time: "08:00", duration_minutes: 15, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 2, notes: "2nd cycle – soak" },
        ],
      },
      {
        valve: 6,
        name: "Star Jasmine",
        schedules: [
          { start_time: "05:15", duration_minutes: 15, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 1, notes: "1st cycle" },
          { start_time: "08:15", duration_minutes: 15, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 2, notes: "2nd cycle – soak" },
        ],
      },
    ],
  },
  {
    controller_program: "B",
    name: "Back",
    description: "Rear yard",
    zones: [
      {
        valve: 2,
        name: "Back",
        schedules: [
          { start_time: "05:30", duration_minutes: 80, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 1 },
        ],
      },
    ],
  },
  {
    controller_program: "C",
    name: "Bay",
    description: "Bay Laurel",
    zones: [
      {
        valve: 3,
        name: "Bay Laurel",
        schedules: [
          { start_time: "04:00", duration_minutes: 30, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 1, notes: "1st cycle" },
          { start_time: "10:30", duration_minutes: 30, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 2, notes: "2nd cycle – soak" },
        ],
      },
    ],
  },
  {
    controller_program: "D",
    name: "Tangerine",
    description: "Crossvine (cycle-and-soak)",
    zones: [
      {
        valve: 4,
        name: "Crossvine",
        schedules: [
          { start_time: "08:30", duration_minutes: 10, days_of_week: ["tue", "thu", "sat"], status: "active", cycle: 1, notes: "1st cycle" },
          { start_time: "08:50", duration_minutes: 10, days_of_week: ["tue", "thu", "sat"], status: "active", cycle: 2, notes: "2nd cycle – soak" },
          { start_time: "09:10", duration_minutes: 10, days_of_week: ["tue", "thu", "sat"], status: "active", cycle: 3, notes: "3rd cycle – soak" },
        ],
      },
    ],
  },
];
