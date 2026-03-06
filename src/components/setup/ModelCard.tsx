import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Check, Download, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

interface ModelCardProps {
    model: {
        id: string;
        name: string;
        description: string;
        exists: boolean;
        recommended?: boolean;
    };
    isSelected: boolean;
    onSelect: () => void;
    disabled?: boolean;
    className?: string;
    accentColor?: "primary" | "accent";
}

export function ModelCard({
    model,
    isSelected,
    onSelect,
    disabled,
    className,
    accentColor = "primary"
}: ModelCardProps) {
    const isAccent = accentColor === "accent";

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all duration-300 relative overflow-hidden",
                model.exists ? "border-green-500/20 bg-green-500/5" : "bg-card/50",
                isSelected ? (isAccent ? "border-accent ring-1 ring-accent/40 bg-accent/10 shadow-lg shadow-accent/5 opacity-100" : "border-primary ring-1 ring-primary/40 bg-primary/10 opacity-100") : "hover:border-primary/50",
                !isSelected && model.exists ? "opacity-60" : "opacity-100",
                model.recommended && !isSelected && "border-amber-500/30",
                className
            )}
            onClick={() => !disabled && onSelect()}
        >
            {model.recommended && (
                <div className="absolute top-0 right-0">
                    <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-sm">
                        <Star className="w-2.5 h-2.5 fill-white" />
                        ACCURACY
                    </div>
                </div>
            )}
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start mr-16">
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    {model.exists && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                </div>
                <CardDescription>{model.description}</CardDescription>
            </CardHeader>
            <CardFooter className="p-4 pt-0">
                {model.exists ? (
                    <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Detected & Ready
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Download className="w-3 h-3" /> Will be downloaded
                    </span>
                )}
            </CardFooter>
        </Card>
    );
}
