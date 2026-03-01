import { toast } from "sonner";
import { X } from "lucide-react";

export function showSuccessToast(title: string) {
  toast.custom((t) => (
    <div className="bg-white dark:bg-black border border-[#EAEAEA] dark:border-[#1E1E1E] min-w-[320px] max-w-xl mb-2 px-4 py-3 rounded-lg bottom-4 flex justify-between items-center lg:bottom-6 z-999 h-16">
      <div>
        <p className="text-sm text-black dark:text-white">{title}</p>
      </div>
      <button
        onClick={() => toast.dismiss(t)}
        className="p-2 rounded-md hover:bg-[#EAEAEA] dark:hover:bg-[#1E1E1E] cursor-pointer text-black dark:text-white"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  ));
}

export function showErrorToast(title: string) {
  toast.custom((t) => (
    <div className="bg-[#D93036] min-w-[280px] max-w-md mb-2 px-4 py-3 rounded-lg bottom-4 flex justify-between items-center lg:bottom-6 z-100 h-16">
      <div>
        <p className="text-sm text-white">{title}</p>
      </div>
      <button
        onClick={() => toast.dismiss(t)}
        className="p-2 rounded-md hover:bg-[#DD464B] cursor-pointer text-white"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  ));
}
