import { PRAYER_ICON_MAP } from "@/components/ui/Icons";
import type { PrayerKey } from "@/types";
import type { Arrival } from "@/hooks/useNextPrayer";

/** What to say when a time arrives — Imsak, Terbit and Dhuha aren't obligatory prayers */
export function arrivalMessage(key: PrayerKey, name: string): { title: string; subtitle: string } {
  switch (key) {
    case "imsak":
      return { title: "Waktu Imsak", subtitle: "Saatnya berhenti makan dan minum" };
    case "terbit":
      return { title: "Matahari Terbit", subtitle: "Waktu sholat Subuh telah berakhir" };
    case "dhuha":
      return { title: "Waktu Dhuha", subtitle: "Waktu sholat sunnah Dhuha telah masuk" };
    default:
      return { title: `Waktunya ${name}!`, subtitle: "Segera tunaikan sholat" };
  }
}

/** "Waktunya …", in place of the digits while a time arrives */
export default function ArrivalNotice({ arrival }: { arrival: Arrival }) {
  const Icon = PRAYER_ICON_MAP[arrival.key];
  const { title, subtitle } = arrivalMessage(arrival.key, arrival.name);
  return (
    <div className="text-center py-2">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Icon size={24} className="animate-pulse-glow text-amber-300" />
      </div>
      <p className="text-lg font-extrabold text-amber-300 md:text-xl">
        {title}
      </p>
      <p className="mt-1 text-xs font-medium text-green-200">
        {subtitle}
      </p>
    </div>
  );
}
