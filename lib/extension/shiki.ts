import { createHighlighter } from "shiki"
import { alxproDark, alxproLight } from "alxpro-theme"

export const highlighterPromise = createHighlighter({
  themes: [alxproDark, alxproLight],
  langs: ["ts", "tsx", "js", "jsx", "json"],
})
