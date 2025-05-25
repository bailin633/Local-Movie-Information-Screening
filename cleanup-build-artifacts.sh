#!/bin/bash

echo "========================================"
echo " Electron项目构建产物清理脚本"
echo "========================================"
echo

echo "正在检查Git状态..."
git status --porcelain

echo
echo "正在从Git中移除构建产物..."

# 移除dist目录（如果已被跟踪）
if [ -d "dist" ]; then
    echo "移除 dist/ 目录..."
    if git rm -r --cached dist/ 2>/dev/null; then
        echo "  ✓ dist/ 已从Git中移除"
    else
        echo "  ℹ dist/ 未被Git跟踪"
    fi
else
    echo "  ℹ dist/ 目录不存在"
fi

# 移除build目录中的构建产物（保留源文件）
if [ -d "build" ]; then
    echo "检查 build/ 目录..."
    git rm --cached build/*.exe 2>/dev/null || true
    git rm --cached build/*.msi 2>/dev/null || true
    git rm --cached build/*.dmg 2>/dev/null || true
    git rm --cached build/*.deb 2>/dev/null || true
    git rm --cached build/*.rpm 2>/dev/null || true
    git rm --cached build/*.AppImage 2>/dev/null || true
    echo "  ℹ build/ 目录已检查"
fi

# 移除根目录下的可执行文件和安装包
echo "移除根目录下的可执行文件..."
git rm --cached *.exe 2>/dev/null || true
git rm --cached *.msi 2>/dev/null || true
git rm --cached *.dmg 2>/dev/null || true
git rm --cached *.deb 2>/dev/null || true
git rm --cached *.rpm 2>/dev/null || true
git rm --cached *.AppImage 2>/dev/null || true
git rm --cached *.app 2>/dev/null || true

echo
echo "正在添加.gitignore更改..."
git add .gitignore

echo
echo "检查当前状态..."
git status --short

echo
echo "========================================"
echo " 清理完成！"
echo "========================================"
echo
echo "下一步操作建议："
echo "1. 检查上面的状态输出"
echo "2. 如果满意，执行提交："
echo "   git commit -m \"feat: 优化.gitignore，移除构建产物\""
echo "3. 推送到远程仓库："
echo "   git push origin main"
echo
echo "注意：如果需要彻底清理Git历史中的大文件，"
echo "请参考 GITIGNORE_OPTIMIZATION_GUIDE.md 中的说明。"
echo

# 在macOS/Linux上不需要pause，但可以等待用户输入
read -p "按Enter键继续..." dummy
