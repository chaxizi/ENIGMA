# 数据来源与算法约定

核对日期：2026-10-14。

## 接线

[Crypto Museum — Enigma wiring，Service Enigma](https://www.cryptomuseum.com/crypto/enigma/wiring.htm)。接线为从右侧入口至左侧出口的映射；参考输入序列为 `ABCDEFGHIJKLMNOPQRSTUVWXYZ`。

| 转子 | 正向接线 | 窗口进位字母 |
| --- | --- | --- |
| I | EKMFLGDQVZNTOWYHXUSPAIBRCJ | Q |
| II | AJDKSIRUXBLHWTMCQGZNPYFVOE | E |
| III | BDFHJLCPRTXVZNYEIWGAKMUSQO | V |
| IV | ESOVPZJAYQUIRHXLNFTGKDCMWB | J |
| V | VZBRGITYUPSDNHLXAWMJQOFECK | Z |
| UKW-B | YRUHQSLDPXNGOKMIEBFZCWVJAT | 固定 |

入口轮为恒等映射。反向接线由正向排列求逆生成。注意来源表中物理 Notch 列和窗口 Turnover 列的区别，程序使用后者。

## 转子偏移

令窗口位置为 p、环位为 r，字母编码为 0–25，offset = p - r。

正向：`mod(forward[mod(x + offset)] - offset, 26)`。

反向：`mod(reverse[mod(x + offset)] - offset, 26)`。

环位改变电气接线偏移，不对窗口进位字母再额外平移。参考 [Py-Enigma Rotor 说明](https://py-enigma.readthedocs.io/en/latest/reference.html)。

## 步进

[David Hamer — Actions Involved in the Double Stepping of the Middle Rotor](https://www.cryptomuseum.com/people/hamer/files/double_stepping.pdf)。

所有缺口条件在进位前计算；右转子总前进，中转子在自身或右转子位于窗口进位字母时前进，左转子在中转子位于窗口进位字母时前进。单次按键中每个转子最多前进一步。之后才处理电气信号。

I / II / III，环位 01 / 01 / 01，从 ADU 开始，连续三次按键的窗口为 ADV、AEW、BFX。

## 固定参考向量

[Py-Enigma 官方使用指南 — Example communication procedure](https://py-enigma.readthedocs.io/en/latest/guide.html)。

配置：II / IV / V，反射器 B，环位 B / U / L（02 / 21 / 12），插线 AV BS CG DL FU HZ IN KM OW RX。

| 起始位置 | 输入 | 期望输出 |
| --- | --- | --- |
| WXC | BLA | KCH |
| BLA | THEXRUSSIANSXAREXCOMINGX | NIBLFMYMLLUFWCASCSSNVHAZ |

测试同时验证反向还原。预期密文是硬编码的参考数据，不能由待测程序生成。

## 历史与产品边界

Enigma I 的原始数字刻度在网页以字母表示；二者一一对应。本版本将插线限制为十对，这是产品范围；26 个插口从结构上允许十三对。文字保留、删除重算、持续显示最后输出均为网页交互约定。
