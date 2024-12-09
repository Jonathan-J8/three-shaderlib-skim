import { watch, computed, ref } from "vue";
import { useRouter } from "vue-router";
import { defineStore } from "pinia";
import { setupThree, compileMaterial } from "./compileMaterial";

export default defineStore("main", () => {
  const pkg = ref(null);
  const semver = ref("");
  const shader = ref("");
  const kind = ref("vertex");
  const compilation = ref(false);
  const loadState = ref("");
  const loadError = ref(null);
  const glslCode = ref("");

  //
  // Load pkg when semver has changed
  //

  watch(
    semver,
    async (v) => {
      if (!v) return;
      pkg.value = null;
      glslCode.value = "";
      loadState.value = "pending";
      delete window.__THREE__;
      try {
        pkg.value = await import(
          /*@vite-ignore*/ `https://unpkg.com/three@${v}/build/three.module.js`
        );
        loadState.value = "fulfilled";
        loadError.value = null;
        setupThree(pkg.value); // setup here to improve later compilation process
      } catch (e) {
        // reset
        pkg.value = null;
        semver.value = "";
        shader.value = "";
        kind.value = "vertex";
        loadState.value = "rejected";
        loadError.value = e;
      }
    },
    { flush: "post" }
  );

  //
  // Handle missing shader in newly loaded pkg
  //

  watch(pkg, () => {
    if (pkg.value) {
      const ks = Object.keys(pkg.value.ShaderLib);
      if (!ks.includes(shader.value)) {
        shader.value = ks[0];
        kind.value = "vertex";
      }
    }
  });

  //
  // Pluck glslCode
  //

  watch([pkg, shader, kind, compilation], () => {
    if (!pkg.value || !shader.value || !kind.value) {
      glslCode.value = "";
      return;
    }

    const str = pkg.value.ShaderLib[shader.value][kind.value + "Shader"];

    if (!compilation.value) {
      glslCode.value = str;
      return;
    }

    try {
      glslCode.value = compileMaterial(pkg.value, shader.value, kind.value) + str;
    } catch (e) {
      glslCode.value = `// Compiled version of this shader is not available \n` + str;
    }
  });

  //
  // Keep in sync with route.
  //

  const router = useRouter();
  watch([semver, shader, kind], () => {
    if (semver.value && shader.value && kind.value) {
      router.replace({
        name: "view",
        params: {
          semver: semver.value,
          shader: shader.value,
          kind: kind.value,
        },
      });
    }
  });

  //
  // Expose TODO https://github.com/vuejs/vue-next/pull/5048
  //

  return {
    pkg: computed(() => pkg.value),
    semver,
    shader,
    kind,
    compilation,
    loadState: computed(() => loadState.value),
    loadError: computed(() => loadError.value),
    glslCode: computed(() => glslCode.value),
  };
});
