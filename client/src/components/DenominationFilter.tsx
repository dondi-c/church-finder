import { useState } from "react";
import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface DenominationFilterProps {
  onSelect: (denomination: string | null) => void;
}

export default function DenominationFilter({ onSelect }: DenominationFilterProps) {
  const { data: denominations } = useQuery<string[]>({
    queryKey: ["/api/churches/denominations"],
  });

  return (
    <Select onValueChange={(value) => onSelect(value === "all" ? null : value)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by denomination" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Denominations</SelectLabel>
          <SelectItem value="all">All Denominations</SelectItem>
          {denominations?.map((denomination) => (
            <SelectItem key={denomination} value={denomination}>
              {denomination}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
