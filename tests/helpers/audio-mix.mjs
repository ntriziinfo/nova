import vm from 'node:vm';

export function installVolumeCalibration(source, context){
  const start = source.indexOf('  const AUDIO_MIX_CENTER');
  const end = source.indexOf('  function audioOutputVolume', start);
  vm.runInContext(source.slice(start, end), context);
}
