import { SCENE_DEFS } from './sceneMarkup';

/** Shared gradients and symbols for every <StationScene>, mounted once per page. */
export function SceneDefs() {
  return <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<defs>${SCENE_DEFS}</defs>` }} />;
}
