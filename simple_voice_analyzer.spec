# -*- mode: python ; coding: utf-8 -*-

import os

# 获取当前目录
current_dir = os.path.dirname(os.path.abspath(SPEC))

a = Analysis(
    ['simple_voice_analyzer.py'],
    pathex=[],
    binaries=[],
    datas=[
        # 添加 models 目录
        (os.path.join(current_dir, 'models'), 'models'),
        # 添加 praat 目录
        (os.path.join(current_dir, 'praat'), 'praat'),
        # 添加 temp 目录（如果需要）
        (os.path.join(current_dir, 'temp'), 'temp'),
        # 添加 ffmpeg 可执行文件
        (os.path.join(current_dir, 'ffmpeg', 'ffmpeg.exe'), 'ffmpeg'),
    ],
    hiddenimports=[
        'simple_logger',
        'simple_analyzer',
        'simple_judger',
        'simple_model',
        'simple_sound',
        'simple_praat',
        'simple_config',
        'simple_utils',
        'simple_ffmpeg',
        'io',
        'codecs',
        'encodings',
        'encodings.utf_8',
        'encodings.cp1252',
        'encodings.gbk',
        'encodings.ascii',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='simple_voice_analyzer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
