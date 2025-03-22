#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import argparse
import json
import simple_logger
import simple_analyzer
import simple_judger
import io
import codecs
import locale

# 设置系统默认编码为 UTF-8
if sys.platform == 'win32':
    # 强制设置环境变量
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    # 设置控制台代码页为 UTF-8
    os.system('chcp 65001 > nul')
    # 设置标准输出为UTF-8编码
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 检查当前编码
print(f"当前系统编码: {locale.getpreferredencoding()}")
print(f"标准输出编码: {sys.stdout.encoding}")
print(f"标准错误编码: {sys.stderr.encoding}")

log = simple_logger.get_logger(__name__)

def analyze_from_url(url, gender=None):
    """
    从URL分析声音
    
    参数:
        url: 音频文件URL
        gender: 性别 (0为男性，1为女性，None为自动判断)
    
    返回:
        分析结果
    """
    try:
        # 下载并转换音频
        wav_path = simple_analyzer.analyze_audio(url)
        
        # 判断声音类型
        result = simple_judger.judge_voice(wav_path, gender)
        
        return result
    except Exception as e:
        log.error(f"从URL分析声音失败: {str(e)}")
        raise

def analyze_from_file(file_path, gender=None):
    """
    从本地文件分析声音
    
    参数:
        file_path: 本地音频文件路径
        gender: 性别 (0为男性，1为女性，None为自动判断)
    
    返回:
        分析结果
    """
    try:
        # 转换音频
        wav_path = simple_analyzer.analyze_local_file(file_path)
        
        # 判断声音类型
        result = simple_judger.judge_voice(wav_path, gender)
        
        return result
    except Exception as e:
        log.error(f"从文件分析声音失败: {str(e)}")
        raise

def main():
    """主函数"""
    # 确保输出编码正确
    if hasattr(sys.stdout, 'encoding') and sys.stdout.encoding != 'utf-8':
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
    
    parser = argparse.ArgumentParser(description='声音分析工具')
    
    # 添加参数
    parser.add_argument('-u', '--url', help='音频文件URL')
    parser.add_argument('-f', '--file', help='本地音频文件路径')
    parser.add_argument('-g', '--gender', type=int, choices=[0, 1], help='性别 (0为男性，1为女性，不指定则自动判断)')
    parser.add_argument('-j', '--json', action='store_true', help='以JSON格式输出结果')
    
    args = parser.parse_args()
    
    # 检查参数
    if not args.url and not args.file:
        parser.error('必须指定URL或文件路径')
    
    if args.url and args.file:
        parser.error('不能同时指定URL和文件路径')
    
    try:
        # 分析声音
        if args.url:
            result = analyze_from_url(args.url, args.gender)
        else:
            result = analyze_from_file(args.file, args.gender)
        
        # 输出结果
        if args.json:
            # 获取最佳匹配的异性音色
            opposite_match = result.get_opposite_gender_match()
            
            # 转换为字典
            result_dict = {
                'main': {
                    'id': result.main.id,
                    'name': result.main.name,
                    'score': result.main.score
                },
                'sub': [
                    {
                        'id': sub.id,
                        'name': sub.name,
                        'score': sub.score
                    } for sub in result.sub
                ]
            }
            
            # 添加最佳匹配的异性音色
            if opposite_match:
                result_dict['opposite_match'] = {
                    'id': opposite_match.id,
                    'name': opposite_match.name
                }
            
            # 使用ASCII转义序列输出JSON，避免编码问题
            json_str = json.dumps(result_dict, ensure_ascii=True, indent=2)
            print(json_str, flush=True)
            
            # 同时输出一个不使用ASCII转义的版本，用于调试
            print("DEBUG_JSON_UTF8:" + json.dumps(result_dict, ensure_ascii=False, indent=2), flush=True)
        else:
            print(simple_judger.format_result(result), flush=True)
        
        return 0
    except Exception as e:
        log.error(f"分析失败: {str(e)}")
        print(f"错误: {str(e)}")
        return 1

if __name__ == '__main__':
    # 确保异常信息也使用UTF-8编码
    sys.excepthook = lambda exctype, value, traceback: print(f"错误: {exctype.__name__}: {value}", file=sys.stderr)
    sys.exit(main()) 