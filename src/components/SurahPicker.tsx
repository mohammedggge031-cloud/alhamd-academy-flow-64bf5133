import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const SURAHS = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس",
];

interface SurahPickerProps {
  onSelect: (text: string) => void;
}

const SurahPicker = ({ onSelect }: SurahPickerProps) => {
  const [search, setSearch] = useState("");
  const [fromAyah, setFromAyah] = useState("");
  const [toAyah, setToAyah] = useState("");

  const filtered = search
    ? SURAHS.filter((s) => s.includes(search))
    : SURAHS;

  const handleSelect = (surah: string) => {
    const surahNum = SURAHS.indexOf(surah) + 1;
    let text = `سورة ${surah}`;
    if (fromAyah && toAyah) {
      text += ` من الآية ${fromAyah} إلى ${toAyah}`;
    } else if (fromAyah) {
      text += ` من الآية ${fromAyah}`;
    }
    onSelect(text);
    setSearch("");
    setFromAyah("");
    setToAyah("");
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="ابحث عن سورة..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-xs"
      />
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="من آية"
          value={fromAyah}
          onChange={(e) => setFromAyah(e.target.value)}
          className="h-8 text-xs w-24"
        />
        <Input
          type="number"
          placeholder="إلى آية"
          value={toAyah}
          onChange={(e) => setToAyah(e.target.value)}
          className="h-8 text-xs w-24"
        />
      </div>
      <ScrollArea className="h-32 rounded-md border border-border">
        <div className="flex flex-wrap gap-1 p-2">
          {filtered.map((surah, i) => (
            <Button
              key={surah}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 hover:bg-primary/10 hover:text-primary"
              onClick={() => handleSelect(surah)}
            >
              {surah}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SurahPicker;
