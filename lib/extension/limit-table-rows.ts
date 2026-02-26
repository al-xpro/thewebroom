import { Extension } from "@tiptap/core"

export const LimitTableRows = Extension.create({
  name: "limitTableRows",

  addCommands() {
    return {
      addRowAfter:
        () =>
        ({ state, chain }) => {
          const { selection } = state
          const { $from } = selection

          let tableNode = null

          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === "table") {
              tableNode = node
              break
            }
          }

          if (!tableNode) return false

          const rowCount = tableNode.childCount

          if (rowCount >= 10) {
            return true
          }

          // Allow normal behavior
          return chain().command(({ tr }) => true).run()
        },
    }
  },
})