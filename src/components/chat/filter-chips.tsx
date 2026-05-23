import { X, MapPin, FolderOpen, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const LOCALITIES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
  "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
  "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
  "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
  "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
  "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

const DOMAINS = [
  "Cư trú", "Khai sinh", "Khai tử", "Hộ chiếu", "Căn cước công dân",
  "Kết hôn", "Giấy phép lái xe", "Đăng ký kinh doanh", "Hải quan",
  "Bảo hiểm xã hội", "Đất đai", "Xây dựng", "Thuế", "Y tế",
];

function Picker({
  value,
  onChange,
  options,
  icon,
  placeholder,
  label,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: string[];
  icon: React.ReactNode;
  placeholder: string;
  label: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            value
              ? "border-primary/30 bg-primary/8 text-primary"
              : "border-dashed border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {icon}
          {value ? (
            <>
              <span>{label}: {value}</span>
              <span
                role="button"
                aria-label="Xoá"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(undefined);
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-primary/10"
              >
                <X className="h-3 w-3" />
              </span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Tìm ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>Không tìm thấy</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem key={opt} onSelect={() => onChange(opt)}>
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function FilterChips({
  locality,
  domain,
  onChange,
}: {
  locality?: string;
  domain?: string;
  onChange: (patch: { locality?: string; domain?: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Picker
        value={locality}
        onChange={(v) => onChange({ locality: v })}
        options={LOCALITIES}
        icon={<MapPin className="h-3.5 w-3.5" />}
        placeholder="Chọn địa phương"
        label="Địa phương"
      />
      <Picker
        value={domain}
        onChange={(v) => onChange({ domain: v })}
        options={DOMAINS}
        icon={<FolderOpen className="h-3.5 w-3.5" />}
        placeholder="Chọn lĩnh vực"
        label="Lĩnh vực"
      />
      {!locality && !domain && (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Plus className="h-3 w-3" /> Lọc giúp AI trả lời chính xác hơn
        </span>
      )}
    </div>
  );
}
