// Scene continuity resolver: immutable identity, location, wardrobe and visual-style locks across an episode.
// Optional bible shape:
// { visualStyleId: "warm-3d", locations: { classroom: { setting: "classroom", label: "Home classroom" } },
//   characters: { ada: { wardrobeId: "school-uniform" } } }
// Scene overrides are explicit and validated; continuityBreak is required to change a locked location/style.
export function resolveSceneContinuity(bible, episode) {
  const errors = [];
  const locations = bible.locations ?? {};
  const chars = bible.characters ?? {};
  const defaultLocationId = bible.defaultLocationId ?? null;
  const styleId = bible.visualStyleId ?? bible.style ?? "default";
  const wardrobeIds = Object.fromEntries(Object.entries(chars).map(([id, c]) => [id, c.wardrobeId ?? "default"]));
  let activeLocation = defaultLocationId;

  const scenes = (episode.scenes ?? []).map((scene, index) => {
    const at = `scene ${index + 1}`;
    const requestedLocation = scene.locationId ?? activeLocation;
    if (requestedLocation && !locations[requestedLocation]) {
      errors.push(`${at}: unknown locationId "${requestedLocation}" (bible locations: ${Object.keys(locations).join(", ") || "none"})`);
    }
    if (index > 0 && scene.locationId && activeLocation && scene.locationId !== activeLocation && !scene.continuityBreak) {
      errors.push(`${at}: location changed from "${activeLocation}" to "${scene.locationId}" without continuityBreak: true`);
    }
    if (scene.visualStyleId && scene.visualStyleId !== styleId && !scene.continuityBreak) {
      errors.push(`${at}: visual style changed from "${styleId}" to "${scene.visualStyleId}" without continuityBreak: true`);
    }
    const who = scene.who?.length ? scene.who : Object.keys(chars).slice(0, 1);
    const wardrobe = {};
    for (const id of who) {
      if (!chars[id]) continue;
      const locked = wardrobeIds[id];
      const requested = scene.wardrobe?.[id];
      if (requested && requested !== locked && !scene.continuityBreak) {
        errors.push(`${at}: wardrobe for "${id}" changed from "${locked}" to "${requested}" without continuityBreak: true`);
      }
      wardrobe[id] = requested ?? locked;
    }
    if (scene.locationId) activeLocation = scene.locationId;
    const location = requestedLocation ? locations[requestedLocation] : null;
    return {
      ...scene,
      locationId: requestedLocation,
      visualStyleId: scene.visualStyleId ?? styleId,
      setting: scene.setting ?? location?.setting,
      wardrobe: { ...(scene.wardrobe ?? {}), ...wardrobe },
      continuity: {
        styleId: scene.visualStyleId ?? styleId,
        locationId: requestedLocation,
        wardrobe,
        characterIds: who.filter((id) => !!chars[id]),
        continuityBreak: !!scene.continuityBreak,
      },
    };
  });
  return { scenes, errors };
}
