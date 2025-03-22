#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import csv
import io
import sys
import pandas as pd
import simple_logger
import simple_config
from simple_sound import get_pitch_percentage
from simple_praat import Praat

log = simple_logger.get_logger(__name__)
conf = simple_config.get_config()

class VoiceModel:
    def __init__(self, name, model_id, pitch_percentage, gender):
        """
        初始化声音模型
        
        参数:
            name: 模型名称
            model_id: 模型ID
            pitch_percentage: 基频百分比分布
            gender: 性别 (0为男性，1为女性)
        """
        self.name = name
        self.id = model_id
        self.pitch_percentage = pitch_percentage
        self.gender = gender
    
    def __repr__(self):
        return f"VoiceModel(name={self.name}, id={self.id}, gender={self.gender})"

class VoiceSubModel:
    def __init__(self, sub_id, name):
        """
        初始化辅助声音模型
        
        参数:
            sub_id: 辅助模型ID
            name: 辅助模型名称
        """
        self.id = sub_id
        self.name = name
    
    def __repr__(self):
        return f"VoiceSubModel(id={self.id}, name={self.name})"

# 模型存储
_male_models = []
_female_models = []
_mapping_models = {}

def male_models():
    """获取男性声音模型列表"""
    return _male_models

def female_models():
    """获取女性声音模型列表"""
    return _female_models

def mapping_models():
    """获取模型映射字典"""
    return _mapping_models

def load_models_from_csv(model_file='voice_model.csv', mapping_file='voice_analyzer_mapping.csv'):
    """
    从CSV文件加载声音模型
    
    参数:
        model_file: 模型CSV文件路径
        mapping_file: 映射CSV文件路径
    """
    # 清空现有模型
    _male_models.clear()
    _female_models.clear()
    _mapping_models.clear()
    
    model_path = os.path.join(conf.model_dir, model_file)
    mapping_path = os.path.join(conf.model_dir, mapping_file)
    
    log.info(f"尝试加载模型文件: {model_path}")
    
    # 检查文件是否存在
    if not os.path.exists(model_path):
        log.error(f"模型文件不存在: {model_path}")
        
        # 如果在PyInstaller环境中，尝试从资源目录加载
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            # 尝试其他可能的路径
            alternative_paths = [
                os.path.join(sys._MEIPASS, 'models', model_file),
                os.path.join(os._MEIPASS, model_file),
                os.path.join(os.path.dirname(sys.executable), 'models', model_file),
                os.path.join(os.path.dirname(sys.executable), model_file)
            ]
            
            for alt_path in alternative_paths:
                log.info(f"尝试替代路径: {alt_path}")
                if os.path.exists(alt_path):
                    model_path = alt_path
                    log.info(f"找到模型文件: {model_path}")
                    break
            else:
                log.warning("无法找到模型文件，将创建示例模型")
                create_sample_models()
                return True
        else:
            # 在非打包环境中，创建示例模型
            log.warning("无法找到模型文件，将创建示例模型")
            create_sample_models()
            return True
    
    # 加载模型
    try:
        # 尝试不同的编码方式读取文件
        encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
        all_models = []
        
        for encoding in encodings:
            try:
                with open(model_path, 'r', encoding=encoding) as csvfile:
                    reader = csv.DictReader(csvfile)
                    all_models = list(reader)
                log.info(f"成功使用 {encoding} 编码读取模型文件")
                break
            except UnicodeDecodeError:
                continue
            except Exception as e:
                log.error(f"读取模型文件时出错 ({encoding}): {str(e)}")
                continue
        
        if not all_models:
            log.error("无法使用任何编码读取模型文件")
            return False
        
        log.info(f"CSV文件中包含 {len(all_models)} 个模型记录")
        
        # 然后处理每个模型
        model_id = 1  # 自动生成模型ID
        for m in all_models:
            try:
                name = m['name']
                gender = int(m['gender'])
                raw_data = m['raw_data']
                
                # 解析基频数据
                pitch_data = pd.read_csv(io.StringIO(raw_data), names=['pitch'])
                pitch_percentage = get_pitch_percentage(pitch_data)
                
                # 创建模型对象
                model = VoiceModel(name, model_id, pitch_percentage, gender)
                model_id += 1  # 递增模型ID
                
                # 添加到相应的模型列表
                if gender == 0:
                    _male_models.append(model)
                else:
                    _female_models.append(model)
                
                # 初始化映射
                _mapping_models[name] = []
            except Exception as e:
                log.error(f"处理模型记录时出错: {str(e)}")
                continue
        
        log.info(f"已加载 {len(_male_models)} 个男性声音模型和 {len(_female_models)} 个女性声音模型")
        
        # 加载映射
        if os.path.exists(mapping_path):
            # 尝试不同的编码方式读取文件
            all_mappings = []
            
            for encoding in encodings:
                try:
                    with open(mapping_path, 'r', encoding=encoding) as csvfile:
                        reader = csv.DictReader(csvfile)
                        all_mappings = list(reader)
                    log.info(f"成功使用 {encoding} 编码读取映射文件")
                    break
                except UnicodeDecodeError:
                    log.warning(f"使用 {encoding} 编码读取映射文件失败，尝试下一种编码")
                    continue
            
            if not all_mappings:
                log.error("无法使用任何编码读取映射文件")
                return True  # 仍然返回True，因为模型已经加载成功
            
            log.info(f"映射CSV文件中包含 {len(all_mappings)} 个映射记录")
            
            # 然后处理每个映射
            sub_id = 1  # 自动生成辅助模型ID
            for m in all_mappings:
                try:
                    name = m['name']
                    sub_name = m['sub_name']
                    
                    if name in _mapping_models:
                        _mapping_models[name].append(VoiceSubModel(sub_id, sub_name))
                        sub_id += 1  # 递增辅助模型ID
                    else:
                        log.warning(f"映射记录中的模型名称不存在: {name}")
                except Exception as e:
                    log.error(f"处理映射记录时出错: {str(e)}")
                    continue
            
            # 不进行去重操作，保留所有映射
            total_mappings = sum(len(v) for v in _mapping_models.values())
            log.info(f"已加载 {total_mappings} 个辅助声音模型")
            
            # 检查是否有映射丢失
            if total_mappings < len(all_mappings):
                log.warning(f"有 {len(all_mappings) - total_mappings} 个映射记录未被加载")
        
        return True
    except Exception as e:
        log.error(f"加载模型失败: {str(e)}")
        return False

def create_sample_models():
    """创建示例模型（当没有CSV文件时使用）"""
    # 清空现有模型
    _male_models.clear()
    _female_models.clear()
    _mapping_models.clear()
    
    # 创建示例男性模型
    male_types = ["暖男音", "青叔音", "大叔音", "青年音", "公子音", "少年音", "正太音", "青受音"]
    for i, name in enumerate(male_types):
        # 创建一个空的基频分布
        df = pd.DataFrame({'id': range(conf.pitch_min, conf.pitch_max), 'cnt': 0})
        df['percentage_cnt'] = df['cnt'] / (df['cnt'].sum() or 1)  # 避免除以零
        
        model = VoiceModel(name, i+1, df[['id', 'percentage_cnt']], 0)
        _male_models.append(model)
        _mapping_models[name] = []
    
    # 创建示例女性模型
    female_types = ["女王音", "御姐音", "御妈音", "软妹音", "少女音", "少萝音", "少御音", "萝莉音"]
    for i, name in enumerate(female_types):
        # 创建一个空的基频分布
        df = pd.DataFrame({'id': range(conf.pitch_min, conf.pitch_max), 'cnt': 0})
        df['percentage_cnt'] = df['cnt'] / (df['cnt'].sum() or 1)  # 避免除以零
        
        model = VoiceModel(name, i+len(male_types)+1, df[['id', 'percentage_cnt']], 1)
        _female_models.append(model)
        _mapping_models[name] = []
    
    # 创建示例映射
    for name in _mapping_models:
        for i in range(3):
            sub_name = f"{name}变种{i+1}"
            sub_id = i + 1  # 简单的递增ID
            _mapping_models[name].append(VoiceSubModel(sub_id, sub_name))
    
    log.info(f"已创建 {len(_male_models)} 个示例男性模型和 {len(_female_models)} 个示例女性模型")
    return True

# 尝试加载模型，如果失败则创建示例模型
if not load_models_from_csv():
    create_sample_models() 