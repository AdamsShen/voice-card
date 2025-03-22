#!/usr/bin/env python
# -*- coding: utf-8 -*-

import pandas as pd
import numpy as np
import simple_logger
import simple_config

log = simple_logger.get_logger(__name__)
conf = simple_config.get_config()

def get_pitch_percentage(pitch_tier):
    """
    计算基频的百分比分布
    
    参数:
        pitch_tier: 包含基频数据的DataFrame
    
    返回:
        包含基频ID和百分比的DataFrame
    """
    # 检查是否有有效的基频数据
    if pitch_tier.empty:
        log.warning("基频数据为空，创建默认分布")
        # 创建一个默认的基频分布
        df = pd.DataFrame({'id': range(conf.pitch_min, conf.pitch_max), 'cnt': 1})
        df['percentage_cnt'] = df['cnt'] / df['cnt'].sum()
        return df[['id', 'percentage_cnt']]
    
    # 过滤掉无效值
    pitch_tier = pitch_tier[pitch_tier['pitch'].notna()]
    
    # 如果过滤后为空，创建默认分布
    if pitch_tier.empty:
        log.warning("过滤后基频数据为空，创建默认分布")
        df = pd.DataFrame({'id': range(conf.pitch_min, conf.pitch_max), 'cnt': 1})
        df['percentage_cnt'] = df['cnt'] / df['cnt'].sum()
        return df[['id', 'percentage_cnt']]
    
    # 将基频转换为整数
    pitch_tier['pitch'] = pitch_tier['pitch'].astype(int)
    
    # 统计每个基频值出现的次数
    pitch = pd.DataFrame(pitch_tier.groupby(['pitch']).size(), columns=['cnt'])
    
    # 补充缺失的基频值
    pitch = fullfill(pitch)
    
    # 计算百分比
    pitch['percentage_cnt'] = pitch['cnt'] / (pitch['cnt'].sum() or 1)  # 避免除以零
    
    return pitch[['id', 'percentage_cnt']]

def fullfill(df):
    """
    补充缺失的基频值
    
    参数:
        df: 基频统计DataFrame
    
    返回:
        补充后的DataFrame
    """
    df['id'] = df.index
    p_list = []
    
    # 为缺失的基频值添加0计数
    for p in range(conf.pitch_min, conf.pitch_max):
        if p not in df['id'].values:
            p_list.append({'id': p, 'cnt': 0})
    
    if p_list:
        df = pd.concat([df, pd.DataFrame(p_list)], ignore_index=True)
    
    return df

def compare_pitch_similarity(pitch_this, pitch_that):
    """
    比较两个声音的相似度
    
    参数:
        pitch_this: 第一个声音的基频百分比
        pitch_that: 第二个声音的基频百分比
    
    返回:
        相似度得分 (0-1之间的浮点数)
    """
    try:
        # 检查输入数据是否有效
        if pitch_this.empty or pitch_that.empty:
            log.warning("基频数据为空，返回默认相似度")
            return 0.25  # 返回一个默认的相似度值
        
        # 确保两个DataFrame都有'id'和'percentage_cnt'列
        required_cols = ['id', 'percentage_cnt']
        if not all(col in pitch_this.columns for col in required_cols) or \
           not all(col in pitch_that.columns for col in required_cols):
            log.error("基频数据缺少必要的列")
            return 0.25
        
        # 合并两个基频分布
        pitch_merge = pd.merge(pitch_this, pitch_that, on='id', how='inner')
        
        # 如果合并后为空，返回默认相似度
        if pitch_merge.empty:
            log.warning("合并后的基频数据为空，返回默认相似度")
            return 0.25
        
        # 计算相似度得分 (基频百分比的乘积之和)
        pitch_merge['score'] = pitch_merge['percentage_cnt_x'] * pitch_merge['percentage_cnt_y']
        score = pitch_merge['score'].sum()
        
        # 确保得分在0-1之间
        score = max(0.0, min(1.0, score))
        
        # 如果得分为NaN，返回默认值
        if np.isnan(score):
            log.warning("相似度计算结果为NaN，返回默认相似度")
            return 0.25
        
        return score
    except Exception as e:
        log.error(f"计算相似度时出错: {str(e)}")
        return 0.25  # 出错时返回默认值

def get_pitch_quantile(df, quantiles=[0.5]):
    """
    计算基频的分位数
    
    参数:
        df: 基频百分比DataFrame
        quantiles: 要计算的分位数列表
    
    返回:
        包含分位数的字典
    """
    result = {}
    try:
        # 检查DataFrame是否有效
        if df.empty or 'id' not in df.columns:
            # 返回默认值
            for quantile in quantiles:
                result[f'quantile_{int(quantile*100)}'] = 150  # 默认中位数
            return result
        
        # 计算分位数
        for quantile in quantiles:
            try:
                value = int(df['id'].quantile(quantile))
                result[f'quantile_{int(quantile*100)}'] = value
            except:
                result[f'quantile_{int(quantile*100)}'] = 150  # 出错时使用默认值
    except Exception as e:
        log.error(f"计算分位数时出错: {str(e)}")
        # 返回默认值
        for quantile in quantiles:
            result[f'quantile_{int(quantile*100)}'] = 150
    
    return result 