# CAD Lab Viewer

CAD Lab Viewer 可打开项目文件夹中的 CadQuery 模型和工程图。修改 Python 源文件时，查看器会自动重新构建。使用查看器检查零件、测量、创建剖面并添加审阅评论。

1. 在查看器中打开项目文件夹。
2. 选择零件、面、工程图视图或尺寸，然后单击 **Add comment**。
3. 通过工具栏中的 **Review** 查看待处理的评论。评论保存在项目中的 `.soma/feedback/review.jsonl`。
4. 使用 **Drawings** 查看工程图并导出 PDF 或 DXF。通过 **Export** 导出 STEP、STL、3MF 等格式。

本项目保留 `soma` 命令行工具。构建、生成工程图和导出可在查看器关闭时运行。渲染静态图像时，查看器必须打开对应的项目。

参见[应用开发指南](app/README.md)和[英文说明](README.md)。本项目源自 [SOMA](https://github.com/Kai-Jungsthoefel/SOMA)，按 [GNU GPL 第 3 版或更高版本](LICENSE)授权。模型文件适用 [SOMA 模型例外条款](MODEL-EXCEPTION.md)。
