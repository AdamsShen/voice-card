#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import zipfile
import shutil
import requests
import platform
import subprocess
from tqdm import tqdm

def download_file(url, save_path):
    """下载文件并显示进度条"""
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    with open(save_path, 'wb') as f, tqdm(
        desc=os.path.basename(save_path),
        total=total_size,
        unit='B',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=1024):
            size = f.write(data)
            bar.update(size)

def download_praat_windows():
    """下载Windows版本的Praat"""
    # 创建praat目录
    praat_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "praat")
    if not os.path.exists(praat_dir):
        os.makedirs(praat_dir)
    
    # 下载Praat
    print("正在下载Praat...")
    
    # 检测系统架构和Windows版本
    is_64bit = platform.machine().endswith('64')
    windows_version = sys.getwindowsversion()
    
    # 获取Windows主版本号
    windows_major = windows_version.major
    
    print(f"检测到Windows版本: {windows_major}.{windows_version.minor}, {'64位' if is_64bit else '32位'}")
    
    # 选择合适的下载链接 - 使用较旧的6.0.43版本，兼容性更好
    if is_64bit:
        url = "https://github.com/praat/praat/releases/download/v6.0.43/praat6043_win64.zip"
    else:
        url = "https://github.com/praat/praat/releases/download/v6.0.43/praat6043_win32.zip"
    
    zip_path = os.path.join(praat_dir, "praat.zip")
    download_file(url, zip_path)
    
    # 解压Praat
    print("正在解压Praat...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(praat_dir)
        
        # 删除zip文件
        os.remove(zip_path)
        
        # 重命名可执行文件
        for file in os.listdir(praat_dir):
            if file.startswith("praatcon"):
                os.rename(os.path.join(praat_dir, file), os.path.join(praat_dir, "praatcon.exe"))
            elif file.startswith("Praat"):
                os.rename(os.path.join(praat_dir, file), os.path.join(praat_dir, "Praat.exe"))
        
        print(f"Praat已下载并解压到: {praat_dir}")
        print(f"Praat可执行文件路径: {os.path.join(praat_dir, 'Praat.exe')}")
    except Exception as e:
        print(f"解压失败: {str(e)}")
        print("尝试直接下载可执行文件...")
        
        # 删除失败的zip文件
        if os.path.exists(zip_path):
            os.remove(zip_path)
        
        # 直接下载exe文件
        if is_64bit:
            url = "https://github.com/praat/praat/releases/download/v6.0.43/praat6043_win64.exe"
        else:
            url = "https://github.com/praat/praat/releases/download/v6.0.43/praat6043_win32.exe"
        
        exe_path = os.path.join(praat_dir, "Praat.exe")
        download_file(url, exe_path)
        print(f"Praat已下载到: {exe_path}")
    
    # 修改配置文件
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "simple_config.py")
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 替换Praat路径
        praat_exe_path = os.path.join(praat_dir, 'Praat.exe')
        # 使用原始字符串表示法
        replacement = 'self.praat_path = r"' + praat_exe_path + '"'
        content = content.replace('self.praat_path = "praatcon"', replacement)
        
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("已自动更新配置文件中的Praat路径")

def download_praat_macos():
    """下载macOS版本的Praat"""
    print("请访问以下链接下载macOS版本的Praat:")
    print("https://www.fon.hum.uva.nl/praat/download_mac.html")
    print("下载后，将应用程序移动到Applications文件夹，并运行以下命令创建符号链接:")
    print("sudo ln -s /Applications/Praat.app/Contents/MacOS/Praat /usr/local/bin/praat")

def download_praat_linux():
    """下载Linux版本的Praat"""
    # 创建praat目录
    praat_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "praat")
    if not os.path.exists(praat_dir):
        os.makedirs(praat_dir)
    
    # 下载Praat
    print("正在下载Praat...")
    url = "https://github.com/praat/praat/releases/download/v6.0.43/praat6043_linux64.tar.gz"
    tar_path = os.path.join(praat_dir, "praat.tar.gz")
    download_file(url, tar_path)
    
    # 解压Praat
    print("正在解压Praat...")
    subprocess.run(["tar", "-xzf", tar_path, "-C", praat_dir])
    
    # 删除tar.gz文件
    os.remove(tar_path)
    
    # 设置可执行权限
    praat_exe = os.path.join(praat_dir, "praat")
    os.chmod(praat_exe, 0o755)
    
    print(f"Praat已下载并解压到: {praat_dir}")
    print(f"Praat可执行文件路径: {praat_exe}")
    
    # 创建符号链接
    try:
        subprocess.run(["sudo", "ln", "-sf", praat_exe, "/usr/local/bin/praat"])
        print("已创建符号链接: /usr/local/bin/praat")
    except:
        print("无法创建符号链接，请手动运行以下命令:")
        print(f"sudo ln -sf {praat_exe} /usr/local/bin/praat")

def main():
    """主函数"""
    print("Praat下载工具")
    print("=============")
    
    system = platform.system()
    if system == "Windows":
        download_praat_windows()
    elif system == "Darwin":  # macOS
        download_praat_macos()
    elif system == "Linux":
        download_praat_linux()
    else:
        print(f"不支持的操作系统: {system}")
        return 1
    
    print("\n下载完成！请按照INSTALL.md中的说明继续安装其他依赖。")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n下载已取消")
        sys.exit(1)
    except Exception as e:
        print(f"下载失败: {str(e)}")
        sys.exit(1) 