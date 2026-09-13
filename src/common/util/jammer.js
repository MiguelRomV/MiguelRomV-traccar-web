const truthy = (value) =>
  value === true || value === 1 || value === '1' || value === 'true' || value === 'on';

export const isJammerActive = (position) => {
  const attributes = position?.attributes || {};
  const alarm = String(attributes.alarm || '').toLowerCase();
  return (
    ['jammer', 'jamming', 'gsmJamming', 'gpsJamming', 'interference'].some((key) =>
      truthy(attributes[key]),
    ) || /jammer|jamming|interference/.test(alarm)
  );
};

export default isJammerActive;
