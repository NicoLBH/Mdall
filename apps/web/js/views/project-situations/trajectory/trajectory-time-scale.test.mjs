import test from "node:test";
import assert from "node:assert/strict";
import { createTrajectoryTimeScale } from "./trajectory-time-scale.js";

test("createTrajectoryTimeScale aligne le zoom day sur minuit local", () => {
  const scale = createTrajectoryTimeScale({
    startDate: "2026-04-27T15:42:11.000Z",
    endDate: "2026-04-30T00:00:00.000Z",
    zoom: "day"
  });

  const startDate = scale.startDate;
  assert.equal(startDate.getHours(), 0);
  assert.equal(startDate.getMinutes(), 0);
  assert.equal(startDate.getSeconds(), 0);
  assert.equal(startDate.getMilliseconds(), 0);
});

test("createTrajectoryTimeScale interprète les dates YYYY-MM-DD en date locale", () => {
  const scale = createTrajectoryTimeScale({
    startDate: "2026-04-01",
    endDate: "2026-04-20",
    zoom: "day"
  });

  const x = scale.timeToX("2026-04-19");
  const date = scale.xToTime(x);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 3);
  assert.equal(date.getDate(), 19);
});
