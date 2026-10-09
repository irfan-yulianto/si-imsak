import { describe, it, expect } from "vitest";
import { arrivalMessage } from "./ArrivalNotice";

describe("arrivalMessage", () => {
  it("tells users to pray only for obligatory prayers", () => {
    expect(arrivalMessage("maghrib", "Maghrib")).toEqual({ title: "Waktunya Maghrib!", subtitle: "Segera tunaikan sholat" });
  });

  it("uses dedicated wording for Imsak, Terbit and Dhuha", () => {
    expect(arrivalMessage("imsak", "Imsak").subtitle).toBe("Saatnya berhenti makan dan minum");
    expect(arrivalMessage("terbit", "Terbit").title).toBe("Matahari Terbit");
    expect(arrivalMessage("dhuha", "Dhuha").title).toBe("Waktu Dhuha");
    for (const key of ["imsak", "terbit", "dhuha"] as const) {
      expect(arrivalMessage(key, key).subtitle).not.toContain("tunaikan");
    }
  });
});
