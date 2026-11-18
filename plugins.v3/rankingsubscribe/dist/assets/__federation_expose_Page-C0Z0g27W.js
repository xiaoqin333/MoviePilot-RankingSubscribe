import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { R as RankingPage } from './RankingPage-h7arYwMJ.js';

const {openBlock:_openBlock,createBlock:_createBlock} = await importShared('vue');


const _sfc_main = {
  __name: 'Page',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'RankingSubscribe' },
  navKey: { type: String, default: 'main' },
  config: { type: Object, default: () => ({}) },
},
  emits: ['action', 'switch', 'close'],
  setup(__props) {





return (_ctx, _cache) => {
  return (_openBlock(), _createBlock(RankingPage, {
    api: __props.api,
    "plugin-id": __props.pluginId,
    "nav-key": __props.navKey,
    config: __props.config,
    onAction: _cache[0] || (_cache[0] = $event => (_ctx.$emit('action'))),
    onSwitch: _cache[1] || (_cache[1] = $event => (_ctx.$emit('switch'))),
    onClose: _cache[2] || (_cache[2] = $event => (_ctx.$emit('close')))
  }, null, 8, ["api", "plugin-id", "nav-key", "config"]))
}
}

};

export { _sfc_main as default };
