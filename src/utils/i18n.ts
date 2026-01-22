
import { useState, useEffect } from 'react';

const translations = {
  zh: {
    startSim: '初始化模拟',
    sysConfig: '系统配置',
    exitProtocol: '退出协议',
    hostEnv: '主机环境',
    cpuLoad: 'CPU 负载',
    memoryUsage: '内存占用',
    reset: '重置',
    submit: '提交配置',
    oracleTitle: '神谕结果预览',
    applyOracle: '采纳神谕',
    discardOracle: '放弃建议',
    bigBang: '开始数字大爆炸',
    presets: '快速预设',
    manualTuning: '手动调参',
    divineMandate: '神谕终端',
    classicMode: '经典模式',
    chaosMode: '灾变模拟',
    zenMode: '文明繁荣',
  },
  en: {
    startSim: 'INITIALIZE SIMULATION',
    sysConfig: 'SYSTEM CONFIG',
    exitProtocol: 'EXIT PROTOCOL',
    hostEnv: 'HOST ENVIRONMENT',
    cpuLoad: 'CPU LOAD',
    memoryUsage: 'MEMORY USAGE',
    reset: 'RESET',
    submit: 'SUBMIT CONFIG',
    oracleTitle: 'ORACLE PREVIEW',
    applyOracle: 'APPLY ORACLE',
    discardOracle: 'DISCARD',
    bigBang: 'START BIG BANG',
    presets: 'PRESETS',
    manualTuning: 'MANUAL TUNING',
    divineMandate: 'DIVINE MANDATE',
    classicMode: 'CLASSIC',
    chaosMode: 'CHAOS',
    zenMode: 'ZEN',
  }
};

type Lang = 'zh' | 'en';

export const useI18n = () => {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('vgene_lang') as Lang) || 'zh';
  });

  const t = (key: keyof typeof translations['zh']) => {
    return translations[lang][key] || key;
  };

  const toggleLang = () => {
    const next = lang === 'zh' ? 'en' : 'zh';
    setLang(next);
    localStorage.setItem('vgene_lang', next);
  };

  return { t, lang, toggleLang };
};
