
export type Language = 'en' | 'zh-CN';

export const translations = {
    'en': {
        serviceDown: 'Service Down: {name}',
        serviceRecovered: 'Service Recovered: {name}',
        url: 'URL',
        error: 'Error',
        status: 'Status',
        downtime: 'Downtime',
        mins: 'mins'
    },
    'zh-CN': {
        serviceDown: '服务告警: {name}',
        serviceRecovered: '服务恢复: {name}',
        url: '目标地址',
        error: '错误信息',
        status: '状态码',
        downtime: '故障持续',
        mins: '分钟'
    }
};

export function t(lang: string, key: keyof typeof translations['en'], params?: Record<string, string | number>): string {
    // Default to zh-CN if lang is not found, or fallback to en
    const locale = (lang === 'en' || lang === 'zh-CN') ? lang : 'zh-CN';
    let text = translations[locale][key] || translations['en'][key] || key;

    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, String(v));
        });
    }
    return text;
}
