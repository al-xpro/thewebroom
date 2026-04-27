export const getStatusBadgeClassName = (status: string | undefined) => {
  const normalizedStatus = status || "published";

  if (normalizedStatus === "published") {
    return "bg-[#EAFAEA] text-[#287A3A] dark:bg-[#0F2E18] dark:text-[#62C073]";
  }

  if (normalizedStatus === "draft") {
    return "bg-[#EEF2FF] text-[#3657C8] dark:bg-[#162042] dark:text-[#90A8FF]";
  }

  return "bg-[#FFF4D6] text-[#A35200] dark:bg-[#331C00] dark:text-[#F2A20D]";
};
