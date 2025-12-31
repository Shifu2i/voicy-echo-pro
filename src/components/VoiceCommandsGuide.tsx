import { HelpCircle, Mic, Edit3, Volume2, Undo2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const VoiceCommandsGuide = () => {
  return (
    <div className="bg-muted rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Voice Commands Guide</span>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {/* Dictation Commands */}
        <AccordionItem value="dictation" className="border-border/50">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <span>Dictation (while recording)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-medium text-foreground">Punctuation</p>
                <ul className="mt-1 space-y-0.5">
                  <li>"period" → .</li>
                  <li>"comma" → ,</li>
                  <li>"question mark" → ?</li>
                  <li>"exclamation mark" → !</li>
                  <li>"colon" → :</li>
                  <li>"semicolon" → ;</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Formatting</p>
                <ul className="mt-1 space-y-0.5">
                  <li>"new line" → line break</li>
                  <li>"new paragraph" → ¶</li>
                  <li>"dash" → —</li>
                  <li>"hyphen" → -</li>
                  <li>"open quote" → "</li>
                  <li>"close quote" → "</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Editing Commands */}
        <AccordionItem value="editing" className="border-border/50">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-muted-foreground" />
              <span>Voice Command Mode</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-xs text-muted-foreground space-y-3 pb-3">
            <div>
              <p className="font-medium text-foreground">Replace Text</p>
              <ul className="mt-1 space-y-0.5">
                <li>"Replace [word] with [word]"</li>
                <li>"Change [word] to [word]"</li>
                <li>"Swap [word] for [word]"</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Delete Text</p>
              <ul className="mt-1 space-y-0.5">
                <li>"Delete [word or phrase]"</li>
                <li>"Remove [word or phrase]"</li>
                <li>"Erase [word or phrase]"</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Insert Text</p>
              <ul className="mt-1 space-y-0.5">
                <li>"Insert [text] after [word]"</li>
                <li>"Insert [text] before [word]"</li>
                <li>"Add [text] after [word]"</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Quick Actions */}
        <AccordionItem value="quick" className="border-border/50">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Undo2 className="w-4 h-4 text-muted-foreground" />
              <span>Quick Actions</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-3">
            <ul className="space-y-1">
              <li><span className="font-medium text-foreground">"Undo"</span> — undo last change</li>
              <li><span className="font-medium text-foreground">"Redo"</span> — redo last undo</li>
              <li><span className="font-medium text-foreground">"Scratch that"</span> — delete last spoken phrase</li>
              <li><span className="font-medium text-foreground">"Capitalize that"</span> — capitalize last word</li>
              <li><span className="font-medium text-foreground">"Capitalize [word]"</span> — capitalize specific word</li>
              <li><span className="font-medium text-foreground">"Word count"</span> — show document stats</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Read Aloud */}
        <AccordionItem value="read" className="border-border/50">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span>Read Aloud</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-3">
            <ul className="space-y-1">
              <li><span className="font-medium text-foreground">"Read back"</span> — read last sentence</li>
              <li><span className="font-medium text-foreground">"Read all"</span> — read entire document</li>
              <li><span className="font-medium text-foreground">"Read selection"</span> — read selected text</li>
              <li><span className="font-medium text-foreground">"Stop reading"</span> — stop text-to-speech</li>
            </ul>
            <p className="text-[10px] text-muted-foreground/70 mt-2">
              Tip: Uses your browser's built-in text-to-speech
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
