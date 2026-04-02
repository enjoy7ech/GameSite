/**
 * TravelModal.js - 行程确认弹窗组件
 * 封装地图点击后的目的地确认逻辑与 UI 渲染
 */
export class TravelModal {
    /**
     * @param {HTMLElement} parentContainer 挂载目标容器
     * @param {Object} options 配置项
     * @param {Function} options.onConfirm 点击出发后的回调 (targetInfo)
     * @param {Function} options.onCancel 点击取消后的回调
     */
    constructor(parentContainer, { onConfirm, onCancel } = {}) {
        this.parent = parentContainer;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.data = null;
        this.dom = null;
        
        this._init();
    }

    _init() {
        // 创建 DOM 结构
        const modal = document.createElement('div');
        modal.id = 'map-confirm-modal';
        modal.className = 'ui-mode-hide'; // 初始隐藏
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>确认前往</h3>
                <div class="target-info">
                    <span id="target-name">目的地</span>
                    <div class="time-cost">
                        耗时: <span id="move-time">0</span> 分钟
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="confirm-move" class="btn-cozy primary">出发</button>
                    <button id="cancel-move" class="btn-cozy">取消</button>
                </div>
            </div>
        `;

        // 绑定内部事件
        modal.querySelector('#confirm-move').onclick = (e) => {
            e.stopPropagation();
            if (this.onConfirm) this.onConfirm(this.data);
            this.hide();
        };

        modal.querySelector('#cancel-move').onclick = (e) => {
            e.stopPropagation();
            if (this.onCancel) this.onCancel();
            this.hide();
        };

        // 点击背景遮罩关闭
        modal.onclick = (e) => {
            if (e.target === modal) this.hide();
        };

        this.dom = modal;
        this.parent.appendChild(modal);

        // 缓存 DOM 引用
        this.refs = {
            targetName: modal.querySelector('#target-name'),
            moveTime: modal.querySelector('#move-time')
        };
    }

    /**
     * 弹出确认窗
     * @param {Object} data 行程数据 { targetName, timeCost, locKey }
     */
    show(data) {
        this.data = data;
        this.refs.targetName.innerText = data.targetName;
        this.refs.moveTime.innerText = data.timeCost;
        this.dom.classList.remove('ui-mode-hide');
    }

    /**
     * 隐藏确认窗
     */
    hide() {
        this.dom.classList.add('ui-mode-hide');
    }

    /**
     * 销毁组件挂载
     */
    destroy() {
        if (this.dom && this.dom.parentNode) {
            this.dom.parentNode.removeChild(this.dom);
        }
    }
}
