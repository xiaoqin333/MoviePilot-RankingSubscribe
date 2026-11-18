import { importShared } from './__federation_fn_import-JrT3xvdd.js';

const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};

const {resolveComponent:_resolveComponent,createVNode:_createVNode,createElementVNode:_createElementVNode,withCtx:_withCtx,createTextVNode:_createTextVNode,openBlock:_openBlock,createElementBlock:_createElementBlock} = await importShared('vue');


const _hoisted_1 = { class: "rank-config" };
const _hoisted_2 = { class: "config-intro" };
const _hoisted_3 = { class: "config-intro__icon" };
const _hoisted_4 = { class: "config-actions" };

const {reactive,watch} = await importShared('vue');



const _sfc_main = {
  __name: 'Config',
  props: {
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
},
  emits: ['save', 'close', 'switch'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const sourceItems = [
  { title: 'TMDB', value: 'tmdb' },
  { title: '豆瓣', value: 'douban' },
  { title: '爱奇艺', value: 'iqiyi' },
  { title: '腾讯视频', value: 'tencent' },
  { title: '优酷', value: 'youku' },
  { title: '芒果TV', value: 'mango' },
];

const typeItems = [
  { title: '电影', value: 'movie' },
  { title: '电视剧', value: 'tv' },
  { title: '综艺', value: 'variety' },
  { title: '动漫', value: 'anime' },
];

const form = reactive({
  enabled: false,
  dry_run: false,
  notify: false,
  skip_existing_library: true,
  cron: '0 */6 * * *',
  api_base: 'https://pan.qbb365.xyz/rank-api',
  auto_sources: [],
  auto_types: ['variety', 'anime'],
  rank_limit: 20,
  min_score: 0,
  max_new_per_run: 40,
  username: '榜单自动订阅',
});

function applyConfig(next) {
  const data = next || {};
  form.enabled = Boolean(data.enabled);
  form.dry_run = Boolean(data.dry_run);
  form.notify = Boolean(data.notify);
  form.skip_existing_library = data.skip_existing_library !== false;
  form.cron = data.cron || '0 */6 * * *';
  form.api_base = data.api_base || 'https://pan.qbb365.xyz/rank-api';
  form.auto_sources = Array.isArray(data.auto_sources)
    ? [...data.auto_sources]
    : sourceItems.map(item => item.value);
  form.auto_types = Array.isArray(data.auto_types)
    ? [...data.auto_types]
    : ['variety', 'anime'];
  form.rank_limit = Number(data.rank_limit || 20);
  form.min_score = Number(data.min_score || 0);
  form.max_new_per_run = Number(data.max_new_per_run || 40);
  form.username = data.username || '榜单自动订阅';
}

watch(
  () => props.initialConfig,
  next => applyConfig(next),
  { immediate: true, deep: true },
);

function save() {
  emit('save', {
    enabled: form.enabled,
    dry_run: form.dry_run,
    notify: form.notify,
    skip_existing_library: form.skip_existing_library,
    cron: form.cron.trim(),
    api_base: form.api_base.trim(),
    auto_sources: [...form.auto_sources],
    auto_types: [...form.auto_types],
    rank_limit: Number(form.rank_limit),
    min_score: Number(form.min_score),
    max_new_per_run: Number(form.max_new_per_run),
    username: form.username.trim(),
  });
}

return (_ctx, _cache) => {
  const _component_v_icon = _resolveComponent("v-icon");
  const _component_v_switch = _resolveComponent("v-switch");
  const _component_v_col = _resolveComponent("v-col");
  const _component_v_row = _resolveComponent("v-row");
  const _component_v_text_field = _resolveComponent("v-text-field");
  const _component_v_select = _resolveComponent("v-select");
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_btn = _resolveComponent("v-btn");

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("section", _hoisted_2, [
      _createElementVNode("div", _hoisted_3, [
        _createVNode(_component_v_icon, {
          icon: "mdi-tune-variant",
          size: "25"
        })
      ]),
      _cache[13] || (_cache[13] = _createElementVNode("div", null, [
        _createElementVNode("h3", null, "自动订阅规则"),
        _createElementVNode("p", null, "定时读取榜单，逐条识别并调用 MoviePilot 原生订阅；已订阅和已入库条目会自动跳过。")
      ], -1))
    ]),
    _createVNode(_component_v_row, { dense: "" }, {
      default: _withCtx(() => [
        _createVNode(_component_v_col, {
          cols: "12",
          md: "6"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_switch, {
              modelValue: form.enabled,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((form.enabled) = $event)),
              color: "primary",
              label: "启用定时自动订阅",
              "hide-details": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, {
          cols: "12",
          md: "6"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_switch, {
              modelValue: form.dry_run,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((form.dry_run) = $event)),
              color: "info",
              label: "自动任务只演练，不真正创建订阅",
              "hide-details": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, {
          cols: "12",
          md: "6"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_switch, {
              modelValue: form.skip_existing_library,
              "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((form.skip_existing_library) = $event)),
              color: "primary",
              label: "跳过媒体库中已有的影片",
              "hide-details": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, {
          cols: "12",
          md: "6"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_switch, {
              modelValue: form.notify,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((form.notify) = $event)),
              color: "primary",
              label: "运行完成后发送 MoviePilot 通知",
              "hide-details": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        })
      ]),
      _: 1
    }),
    _createVNode(_component_v_text_field, {
      modelValue: form.api_base,
      "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((form.api_base) = $event)),
      label: "榜单 API 地址",
      variant: "outlined",
      density: "comfortable",
      "prepend-inner-icon": "mdi-api",
      hint: "填写到 /rank-api 这一层，插件会自动请求 /api/v1 下的 JSON 接口",
      "persistent-hint": ""
    }, null, 8, ["modelValue"]),
    _createVNode(_component_v_select, {
      modelValue: form.auto_sources,
      "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((form.auto_sources) = $event)),
      items: sourceItems,
      "item-title": "title",
      "item-value": "value",
      label: "自动订阅来源",
      chips: "",
      multiple: "",
      "closable-chips": "",
      variant: "outlined",
      density: "comfortable",
      hint: "留空会停用自动订阅；建议保留全部来源，同一影片会在 MP 内自动去重",
      "persistent-hint": ""
    }, null, 8, ["modelValue"]),
    _createVNode(_component_v_select, {
      modelValue: form.auto_types,
      "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((form.auto_types) = $event)),
      items: typeItems,
      "item-title": "title",
      "item-value": "value",
      label: "自动订阅类型",
      chips: "",
      multiple: "",
      "closable-chips": "",
      variant: "outlined",
      density: "comfortable"
    }, null, 8, ["modelValue"]),
    _createVNode(_component_v_row, { dense: "" }, {
      default: _withCtx(() => [
        _createVNode(_component_v_col, {
          cols: "12",
          md: "4"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_text_field, {
              modelValue: form.cron,
              "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((form.cron) = $event)),
              label: "执行周期",
              variant: "outlined",
              density: "compact",
              placeholder: "0 */6 * * *",
              hint: "5 位 Cron；默认每 6 小时",
              "persistent-hint": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, {
          cols: "12",
          md: "4"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_text_field, {
              modelValue: form.rank_limit,
              "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((form.rank_limit) = $event)),
              modelModifiers: { number: true },
              type: "number",
              min: "1",
              max: "50",
              label: "每个来源取前 N 部",
              variant: "outlined",
              density: "compact"
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, {
          cols: "12",
          md: "4"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_text_field, {
              modelValue: form.max_new_per_run,
              "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((form.max_new_per_run) = $event)),
              modelModifiers: { number: true },
              type: "number",
              min: "1",
              max: "200",
              label: "每次最多处理 N 部",
              variant: "outlined",
              density: "compact",
              hint: "避免首次运行同时触发大量 TMDB 查询",
              "persistent-hint": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, {
          cols: "12",
          md: "4"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_text_field, {
              modelValue: form.min_score,
              "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((form.min_score) = $event)),
              modelModifiers: { number: true },
              type: "number",
              min: "0",
              max: "10",
              step: "0.1",
              label: "最低榜单评分",
              variant: "outlined",
              density: "compact",
              hint: "0 表示不限；无评分条目在设置阈值后会被跳过",
              "persistent-hint": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, {
          cols: "12",
          md: "8"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_text_field, {
              modelValue: form.username,
              "onUpdate:modelValue": _cache[11] || (_cache[11] = $event => ((form.username) = $event)),
              label: "订阅归属名称",
              variant: "outlined",
              density: "compact",
              hint: "写入 MoviePilot 订阅的 username 字段，便于筛选来源",
              "persistent-hint": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        })
      ]),
      _: 1
    }),
    _createVNode(_component_v_alert, {
      type: "info",
      variant: "tonal",
      density: "compact",
      class: "mt-3"
    }, {
      default: _withCtx(() => [...(_cache[14] || (_cache[14] = [
        _createTextVNode(" 自动任务会先按评分筛选，再通过 TMDB/豆瓣身份或标题识别；同一影片即使出现在多个榜单，也只会保留一条 MoviePilot 订阅。手动点击始终执行真实订阅，不受“仅演练”开关影响。 ", -1)
      ]))]),
      _: 1
    }),
    _createElementVNode("div", _hoisted_4, [
      _createVNode(_component_v_btn, {
        variant: "text",
        onClick: _cache[12] || (_cache[12] = $event => (emit('close')))
      }, {
        default: _withCtx(() => [...(_cache[15] || (_cache[15] = [
          _createTextVNode("关闭", -1)
        ]))]),
        _: 1
      }),
      _createVNode(_component_v_btn, {
        color: "primary",
        variant: "flat",
        "prepend-icon": "mdi-content-save",
        onClick: save
      }, {
        default: _withCtx(() => [...(_cache[16] || (_cache[16] = [
          _createTextVNode("保存配置", -1)
        ]))]),
        _: 1
      })
    ])
  ]))
}
}

};
const Config = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-40d3ce11"]]);

export { _export_sfc as _, Config as default };
