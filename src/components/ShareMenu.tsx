import { Mail, MessageCircle, Send, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareMenuProps {
  disabled?: boolean;
  label: string;
  onDeviceShare: () => Promise<void> | void;
  onEmail: () => Promise<void> | void;
  onTelegram: () => Promise<void> | void;
  onWhatsApp: () => Promise<void> | void;
}

export function ShareMenu({
  disabled,
  label,
  onDeviceShare,
  onEmail,
  onTelegram,
  onWhatsApp,
}: ShareMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => void onDeviceShare()}>
          <Share2 className="mr-2 h-4 w-4" />
          Share via device
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void onWhatsApp()}>
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void onTelegram()}>
          <Send className="mr-2 h-4 w-4" />
          Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void onEmail()}>
          <Mail className="mr-2 h-4 w-4" />
          Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}