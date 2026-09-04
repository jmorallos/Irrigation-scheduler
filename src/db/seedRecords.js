/**
 * Sample data matching the latest program / valve / cycle shape.
 * Programs A–C use weekday watering. D (Tangerine) uses interval watering
 * so both modes are present when sample data is loaded.
 */
export const SEED_RECORDS = [
  {
    controller_program: "A",
    name: "Fnt-Crt-Star",
    description: "Front, Courtyard, and Jasmine",
    watering_mode: "weekday",
    interval_days: null,
    program_start_date: null,
    program_end_date: null,
    never_on_days: [],
    zones: [
      {
        valve: 1,
        name: "Front",
        gph: 210,
        last_water_date: "2026-09-02",
        last_water_time: "04:30",
        last_water_duration_minutes: 30,
        schedules: [
          { start_time: "04:30", duration_minutes: 30, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 1, notes: "1st cycle" },
          { start_time: "07:30", duration_minutes: 30, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 2, notes: "2nd cycle – soak" },
        ],
      },
      {
        valve: 5,
        name: "Courtyard",
        gph: 120,
        last_water_date: "2026-09-02",
        last_water_time: "05:00",
        last_water_duration_minutes: 15,
        schedules: [
          { start_time: "05:00", duration_minutes: 15, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 1 },
          { start_time: "08:00", duration_minutes: 20, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 2 },
        ],
      },
      {
        valve: 6,
        name: "Jasmine",
        gph: 60,
        last_water_date: "2026-09-02",
        last_water_time: "05:15",
        last_water_duration_minutes: 15,
        schedules: [
          { start_time: "05:15", duration_minutes: 15, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 1, notes: "1st cycle" },
          { start_time: "08:20", duration_minutes: 30, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 2, notes: "2nd cycle – soak" },
        ],
      },
    ],
  },
  {
    controller_program: "B",
    name: "Back",
    description: "Rear yard",
    watering_mode: "weekday",
    interval_days: null,
    program_start_date: null,
    program_end_date: null,
    never_on_days: [],
    zones: [
      {
        valve: 2,
        name: "Back",
        gph: 180,
        last_water_date: "2026-09-02",
        last_water_time: "05:30",
        last_water_duration_minutes: 80,
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
    watering_mode: "weekday",
    interval_days: null,
    program_start_date: null,
    program_end_date: null,
    never_on_days: [],
    zones: [
      {
        valve: 3,
        name: "Bay Laurel",
        gph: 150,
        last_water_date: "2026-09-02",
        last_water_time: "04:00",
        last_water_duration_minutes: 60,
        schedules: [
          { start_time: "04:00", duration_minutes: 60, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 1, notes: "1st cycle" },
          { start_time: "10:00", duration_minutes: 60, days_of_week: ["mon", "wed", "fri", "sat"], status: "active", cycle: 2, notes: "2nd cycle – soak" },
        ],
      },
    ],
  },
  {
    controller_program: "D",
    name: "Tangerine",
    description: "Crossvine (cycle-and-soak)",
    watering_mode: "interval",
    interval_days: 3,
    program_start_date: "2026-08-31",
    program_end_date: "2026-09-08",
    never_on_days: ["sun"],
    zones: [
      {
        valve: 4,
        name: "Crossvine",
        gph: 90,
        last_water_date: "2026-09-03",
        last_water_time: "08:30",
        last_water_duration_minutes: 30,
        schedules: [
          { start_time: "08:30", duration_minutes: 30, days_of_week: ["tue", "thu", "sat"], status: "active", cycle: 1, notes: "1st cycle" },
          { start_time: "13:00", duration_minutes: 30, days_of_week: ["tue", "thu", "sat"], status: "active", cycle: 2, notes: "2nd cycle – soak" },
        ],
      },
    ],
  },
];
