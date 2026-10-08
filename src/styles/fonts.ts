export const fontGroups = [
  {
    label: "Sans serif",
    fonts: [
      { label: "System UI", value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' },
      { label: "Arial", value: "Arial, Helvetica, sans-serif" },
      { label: "Helvetica Neue", value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
      { label: "Inter", value: "Inter, Arial, sans-serif" },
      { label: "Roboto", value: 'Roboto, "Helvetica Neue", Arial, sans-serif' },
      { label: "Open Sans", value: '"Open Sans", Arial, sans-serif' },
      { label: "Lato", value: "Lato, Arial, sans-serif" },
      { label: "Montserrat", value: "Montserrat, Arial, sans-serif" },
      { label: "Segoe UI", value: '"Segoe UI", Arial, sans-serif' },
      { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
      { label: "Tahoma", value: "Tahoma, Verdana, sans-serif" },
      { label: "Trebuchet MS", value: '"Trebuchet MS", Arial, sans-serif' },
    ],
  },
  {
    label: "Serif",
    fonts: [
      { label: "Georgia", value: "Georgia, Times New Roman, serif" },
      { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
      { label: "Garamond", value: 'Garamond, "Times New Roman", serif' },
      { label: "Palatino", value: 'Palatino, "Palatino Linotype", "Book Antiqua", serif' },
    ],
  },
  {
    label: "Monospace",
    fonts: [
      { label: "Menlo", value: "Menlo, Consolas, monospace" },
      { label: "Consolas", value: "Consolas, Menlo, monospace" },
      { label: "Courier New", value: '"Courier New", Courier, monospace' },
      { label: "Monaco", value: "Monaco, Menlo, Consolas, monospace" },
      { label: "JetBrains Mono", value: '"JetBrains Mono", Menlo, Consolas, monospace' },
      { label: "Fira Code", value: '"Fira Code", Menlo, Consolas, monospace' },
      { label: "Source Code Pro", value: '"Source Code Pro", Consolas, monospace' },
    ],
  },
  {
    label: "Chinese / CJK",
    fonts: [
      { label: "PingFang SC · 苹方", value: '"PingFang SC", "Microsoft YaHei", Arial, sans-serif' },
      { label: "Microsoft YaHei · 微软雅黑", value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
      { label: "Noto Sans SC · 思源黑体", value: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif' },
      { label: "Noto Serif SC · 思源宋体", value: '"Noto Serif SC", "Songti SC", SimSun, serif' },
      { label: "Songti SC · 宋体", value: '"Songti SC", SimSun, serif' },
    ],
  },
] as const;

export const fontStacks = fontGroups.flatMap((group) => group.fonts.map((font) => font.value));
