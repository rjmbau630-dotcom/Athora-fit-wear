import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WhatsAppChat() {
  const [open, setOpen] = useState(false);

  const whatsappNumber = "254724357210";
  const message = encodeURIComponent(
    "Hi Atora Fit Wear! I'm interested in your gym wear collection. Can you help me?"
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-green-500/30 transition-shadow"
      >
        {open ? (
          <X size={24} className="text-white" />
        ) : (
          <MessageCircle size={24} className="text-white" />
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-zinc-900 rounded-lg shadow-2xl border border-zinc-800 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-green-600 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm">
                  Atora Fit Wear
                </h4>
                <p className="text-green-200 text-xs">Typically replies fast</p>
              </div>
            </div>

            {/* Chat Area */}
            <div className="p-4 h-48 overflow-y-auto bg-zinc-900">
              <div className="bg-zinc-800 rounded-lg rounded-tl-none p-3 max-w-[85%]">
                <p className="text-zinc-200 text-sm">
                  Hey! Welcome to Atora Fit Wear. How can we help you today? 💪
                </p>
                <p className="text-zinc-500 text-[10px] mt-1">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-900">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-md transition-colors text-sm font-medium"
              >
                <span>Start Chat on WhatsApp</span>
                <Send size={16} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
