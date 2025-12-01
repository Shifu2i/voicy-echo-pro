import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Briefcase, 
  MessageCircle, 
  CheckCircle2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from 'sonner';

interface EditCommandsProps {
  text: string;
  onEditComplete: (editedText: string) => void;
}

export const EditCommands = ({ text, onEditComplete }: EditCommandsProps) => {
  const executeEdit = async (instruction: string, label: string) => {
    if (!text.trim()) {
      toast.error('Please enter some text first');
      return;
    }

    try {
      toast.loading(`Applying "${label}" edit...`);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, instruction })
        }
      );

      if (!response.ok) {
        throw new Error('Edit failed');
      }

      const data = await response.json();
      onEditComplete(data.editedText);
      toast.success(`${label} edit applied`);
    } catch (error) {
      console.error('Error editing text:', error);
      toast.error('Failed to apply edit');
    }
  };

  const commands = [
    {
      label: 'Make Formal',
      instruction: 'Rewrite this text in formal, professional language',
      icon: Briefcase,
      variant: 'outline' as const
    },
    {
      label: 'Make Casual',
      instruction: 'Rewrite this text in casual, friendly language',
      icon: MessageCircle,
      variant: 'outline' as const
    },
    {
      label: 'Fix Grammar',
      instruction: 'Correct any spelling and grammar errors in this text',
      icon: CheckCircle2,
      variant: 'outline' as const
    },
    {
      label: 'Expand',
      instruction: 'Add more detail and elaboration to this text',
      icon: Maximize2,
      variant: 'outline' as const
    },
    {
      label: 'Shorten',
      instruction: 'Condense this text while maintaining key information',
      icon: Minimize2,
      variant: 'outline' as const
    },
    {
      label: 'Improve',
      instruction: 'Improve the clarity, flow, and impact of this text',
      icon: Sparkles,
      variant: 'default' as const
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {commands.map((command) => {
        const Icon = command.icon;
        return (
          <Button
            key={command.label}
            onClick={() => executeEdit(command.instruction, command.label)}
            variant={command.variant}
            size="sm"
            className="smooth-transition"
          >
            <Icon className="mr-2 h-4 w-4" />
            {command.label}
          </Button>
        );
      })}
    </div>
  );
};
