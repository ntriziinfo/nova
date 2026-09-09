import json
from pathlib import Path
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager,ticker

data=json.loads(Path('docs/comeback114-distribution.json').read_text(encoding='utf-8'))
font=next((Path(p) for p in ['C:/Windows/Fonts/YuGothM.ttc','C:/Windows/Fonts/meiryo.ttc','C:/Windows/Fonts/msgothic.ttc'] if Path(p).exists()),None)
if font:
    font_manager.fontManager.addfont(str(font))
    plt.rcParams['font.family']=font_manager.FontProperties(fname=str(font)).get_name()
plt.rcParams.update({'axes.unicode_minus':False,'font.size':11,'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,'axes.edgecolor':'#cbd5e1','text.color':'#17253f','axes.labelcolor':'#475569','xtick.color':'#64748b','ytick.color':'#64748b'})
for mode,label in [('stopped','コンプリート停止あり'),('unlimited','コンプリート停止なし')]:
    rows=data['settings']
    low=min(r[mode]['min'] for r in rows)
    high=max(r[mode]['max'] for r in rows)
    step=2000 if mode=='stopped' else 5000
    bins=np.arange(np.floor(low/step)*step,(np.floor(high/step)+2)*step,step)
    fig,axs=plt.subplots(3,2,figsize=(14,13),sharex=True,sharey=True)
    fig.patch.set_facecolor('#f5f7fb')
    for ax,row in zip(axs.flat,rows):
        d=row[mode];vals=np.asarray(d['values']);h,_=np.histogram(vals,bins=bins)
        colors=['#6f839d' if (a+b)/2<0 else '#16a6a0' for a,b in zip(bins[:-1],bins[1:])]
        if mode=='stopped':colors[-1]='#de9b25'
        ax.set_facecolor('#ffffff')
        ax.bar(bins[:-1],h/len(vals)*100,width=step*.93,align='edge',color=colors,zorder=3)
        ax.axvline(0,color='#334155',lw=1,zorder=4)
        ax.set_title(f"設定 {row['setting']}　勝率 {d['winRate']:.1%}",loc='left',fontsize=15,fontweight='bold',pad=27)
        ax.text(0,1.015,f"平均 {d['mean']:+,.0f}pt ／ 中央値 {d['median']:+,.0f}pt ／ ＋10,000pt到達 {row['report']['completeRate']:.1%}",transform=ax.transAxes,ha='left',va='bottom',fontsize=9,color='#475569')
        ax.grid(axis='y',color='#e2e8f0',lw=.7,zorder=0)
        ax.set_ylabel('試行の割合（%）')
        ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda x,pos:f'{int(x/1000):+d}k' if x else '0'))
        ax.tick_params(axis='both',length=0)
    for ax in axs[-1]:ax.set_xlabel('終了時の差枚（pt）')
    n=rows[0][mode]['trials']
    fig.suptitle('引き戻し5G追加｜30,000Gの出玉分布',fontsize=23,fontweight='bold',x=.07,ha='left',y=.978)
    text=f'{label} ／ 各設定 {n:,}試行 ／ 勝率＝終了差枚がプラスの割合'
    fig.text(.07,.94,text,fontsize=12,color='#475569')
    note='各軌跡は30,000Gまで計算し、初回差枚＋10,000pt到達Gで切り出して集計。金色はコンプリート帯。' if mode=='stopped' else '差枚＋10,000pt到達後も30,000Gまで継続した比較用の集計。到達率は途中で一度でも到達した割合。'
    fig.text(.07,.022,note,fontsize=10,color='#64748b')
    fig.subplots_adjust(left=.07,right=.97,top=.885,bottom=.075,hspace=.40,wspace=.12)
    output=Path(f'docs/comeback114-{mode}-distribution.png')
    fig.savefig(output,dpi=160,facecolor=fig.get_facecolor())
    plt.close(fig)
    print(output)
