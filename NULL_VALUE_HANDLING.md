# 后端 null 值处理改进

## ✅ 已完成的修改

### 1. **股票价格查询 API**
- ✅ 股票代码：null → "未知股票"
- ✅ 行业：null → "未知行业"
- ✅ 当前价格：null → 0.0
- ✅ 总股本：null → 0.0
- ✅ 总市值：null → 0.0

### 2. **资产负债表 API**
- ✅ 股票代码：null → "未知股票"
- ✅ 股票名称：null → "未知股票"
- ✅ 报告日期：null → ""
- ✅ 投资性房地产：null → 0.0
- ✅ 在建工程：null → 0.0
- ✅ 固定资产：null → 0.0
- ✅ 总资产：null → 0.0

### 3. **历史报告数据**
- ✅ EPS：null → 0.0
- ✅ 每股净资产：null → 0.0
- ✅ 总营收：null → 0.0
- ✅ 营收同比：null → 0.0
- ✅ 净利润：null → 0.0
- ✅ 净利润同比：null → 0.0
- ✅ 扣非净利润：null → 0.0
- ✅ 扣非净利润同比：null → 0.0

### 4. **资产类型判定**
- ✅ 重资产比例：null → 0.0
- ✅ 估值方法：null → "UNKNOWN"

### 5. **复合增长率计算**
- ✅ 历史增长率：null → 0.0
- ✅ 最新同比增长率：null → 0.0
- ✅ 五年 CAGR：null → 0.0
- ✅ 综合增长率：null → 0.0

## 📝 修改的函数

### 股票价格相关
- `map_quote()` - 将所有数值型字段 null 值转为 0.0
- `get_current_quote()` - 返回完整数据，所有 null 值已处理

### 资产负债表相关
- `get_balance_sheet_assets()` - 处理所有字段 null 值
- `safe_float()` - 新增安全浮点数转换函数

### 历史数据相关
- `map_annual_report()` - 处理所有历史报告数据 null 值
- `map_last_year()` - 处理去年数据 null 值
- `map_latest_report()` - 处理最新报告数据 null 值

### 计算相关
- `calculate_valuation_method()` - 处理资产比例计算中的 null 值
- `calculate_composite_revenue_growth()` - 处理增长率计算中的 null 值

## 🔄 Safe Float 转换逻辑

新增了 `safe_float(value)` 辅助函数，统一处理 null 值：

```python
def safe_float(value: Any) -> float:
    if value is None or value == "" or value == "--":
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0
```

## 📊 处理效果

**之前：**
```json
{
  "stock_code": "000001.SZ",
  "stock_name": null,
  "current_price": null,
  "industry": null
}
```

**之后：**
```json
{
  "stock_code": "000001.SZ",
  "stock_name": "未知股票",
  "current_price": 0.0,
  "industry": "未知行业"
}
```

## 🎯 优势

1. **前端友好** - 避免前端显示 "null" 或 "--"
2. **统一处理** - 所有 null 值都转换为 0.0
3. **安全可靠** - 添加了异常处理，防止程序崩溃
4. **完整数据** - 即使某个字段缺失，也能返回完整的结果

## 🚀 使用说明

重启后端服务以应用更改：

```bash
cd service/backend
.\.venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

然后刷新前端页面测试。
