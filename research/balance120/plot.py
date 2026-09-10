import json
from pathlib import Path
import sys
local_deps = Path(__file__).resolve().parents[3] / 'plot-deps120'
if local_deps.exists(): sys.path.insert(0,str(local_deps))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
font = Path('C:/Windows/Fonts/meiryo.ttc')
if font.exists():
    font_manager.fontManager.addfont(str(font))
    plt.rcParams['font.family'] = font_manager.FontProperties(fname=str(font)).get_name()
plt.rcParams.update({'axes.unicode_minus':False, 'font.size':11})
data=json.loads(Path('docs/balance120-waveforms.json').read_text(encoding='utf-8'))
fig,axes=plt.subplots(2,2,figsize=(14,8),sharex=True,sharey=True)
colors=['#db7653','#266da8','#8b5caf']
values=[pt[1] for panel in data['panels'] for curve in panel['curves'] for pt in curve['points']]
low=min(-6000, (min(values)//2000)*2000)
for ax,panel in zip(axes.flat,data['panels']):
    for color,curve in zip(colors,panel['curves']):
        xy=curve['points']
        ax.plot([p[0] for p in xy],[p[1] for p in xy],color=color,lw=1.4,label=f"最終差枚 {curve['percentile']:.0%}点")
    ax.axhline(0,color='#a5adb5',lw=1)
    ax.axhline(10000,color='#aab6bc',ls='--',lw=1)
    ax.set(xlim=(0,30000),ylim=(low,11000),title=f"設定{panel['setting']} — {'変更前' if panel['version']=='before' else '変更後'}（{panel['trials']:,}試行）")
    ax.grid(alpha=.18)
    ax.spines[['right','top']].set_visible(False)
    ax.set_xticks([0,10000,20000,30000],['0','10,000','20,000','30,000'])
for ax in axes[:,0]: ax.set_ylabel('差枚（pt）')
for ax in axes[-1,:]: ax.set_xlabel('消化ゲーム数')
fig.suptitle('出玉波形の比較：BIG 50pt・初期AT 300pt・分散型チャレンジ',fontsize=16,y=.99)
handles,labels=axes[0,0].get_legend_handles_labels()
fig.legend(handles,labels,loc='lower center',ncol=3,bbox_to_anchor=(.5,.035),frameon=False)
fig.text(.5,.015,'各群の最終差枚10%・50%・90%点の試行を機械的に選択。20G間隔で描画。＋10,000pt到達で停止。個別の出方の保証ではありません。',ha='center',fontsize=9,color='#525b64')
fig.tight_layout(rect=(0,.09,1,.96))
fig.savefig('docs/balance120-waveforms.png',dpi=150,bbox_inches='tight',facecolor='white')
