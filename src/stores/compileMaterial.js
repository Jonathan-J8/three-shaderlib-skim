let _renderer, _scene, _camera, _mesh, _geometry, _shaderRef;

const SEPARATOR = "ErrorSeparator";

const onShaderError = (kind) => (gl, _, vs, fs) => {
  //
  // The compiled shader result on statements that are not present before the first line of the not compiled shader
  //

  const regex = new RegExp(`([\\s\\S]*?)(?=${SEPARATOR})`, "gm");

  let shader = gl.getShaderSource(kind === "vertex" ? vs : fs);
  if (!shader) throw new Error("shader source not found");
  shader = shader.match(regex); // get all characters from the beginning to the separator
  if (!shader) throw new Error(`line "${SEPARATOR}" not found`);
  shader = shader[0].replace(/^[ \t]+(?=precision)/gm, ""); // additional: remove space and tab before "precision" statements

  _shaderRef = shader;
};

export const setupThree = (Three) => {
  //
  // Needed instances before compiling shader
  //
  if (!_renderer) _renderer = new Three.WebGLRenderer();
  if (!_scene) _scene = new Three.Scene();
  if (!_camera) _camera = new Three.PerspectiveCamera();
  if (!_geometry) _geometry = new Three.PlaneGeometry();
};

export const compileMaterial = (Three, shader, kind) => {
  if (!_renderer || !_scene || !_camera || !_geometry)
    throw new Error("Threejs instances not setup");

  //
  // Setup the material
  //

  const regex = new RegExp(`${shader}material`, "i");
  const materialName = Object.keys(Three).find((name) => name.match(regex));
  if (!materialName) throw new Error(`material "${materialName}" not found`);
  const material = new Three[materialName]();
  material.onBeforeCompile = (glShader) => {
    const type = `${kind}Shader`;
    glShader[type] = SEPARATOR + glShader[type]; // porvoke a desired error
  };

  //
  // Setup the mesh
  //

  if (materialName.match(/points/i)) _mesh = new Three.Line(_geometry, material);
  else if (materialName.match(/line/i)) _mesh = new Three.Points(_geometry, material);
  else if (materialName.match(/sprite/i)) _mesh = new Three.Sprite(material);
  else _mesh = new Three.Mesh(_geometry, material);

  //
  // Render
  //

  _renderer.debug.onShaderError = onShaderError(kind); // get shader source from provoked error ;
  _scene.add(_camera, _mesh);
  _renderer.render(_scene, _camera);

  //
  // Clear
  //

  material.dispose();
  _scene.clear();
  _mesh = undefined;

  return _shaderRef;
};
