let _renderer, _scene, _camera, _mesh, _geometry, _compiledShader, _shaderRef;

const onShaderError = (kind) => (gl, _, vs, fs) => {
  //
  // The compiled shader result on statements that are not present before the first line of _shaderRef
  //

  let shader = gl.getShaderSource(kind === "vertex" ? vs : fs);
  if (!shader) throw new Error("Compilation error: shader not found");

  const separator = _shaderRef.match(/^(.*)$/m)[0]; // separator is the first line of _shaderRef
  const regex = new RegExp(`([\\s\\S]*?)(?=${separator})`, "gm");
  shader = shader.match(regex); // get all characters from the beginning to the separator
  if (!shader) throw new Error(`Compilation error: line "${separator}" not found'`);

  shader = shader[0].replace(/^[ \t]+(?=precision)/gm, ""); // additional: remove space and tab before "precision" statements
  _shaderRef = shader + _shaderRef;
  _shaderRef = _shaderRef.slice(0, -1); // remove the '/' at the end
};

const onBeforeCompile = (kind) => (glShader) => {
  _shaderRef = glShader[kind] = glShader[kind] + "/"; // adding '/' at the end to provoke error
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
  _renderer.debug.onShaderError = onShaderError(kind);
  _mesh = undefined;
  _scene.clear();

  console.log(Three.ShaderLib);

  //
  // Setup the material
  //

  const regex = new RegExp(`${shader}material`, "i");
  const materialName = Object.keys(Three).find((name) => name.match(regex));
  if (!materialName) throw new Error(`Compilation error: material name is "${materialName}"`);
  const material = new Three[materialName]();
  material.onBeforeCompile = onBeforeCompile(`${kind}Shader`);

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
