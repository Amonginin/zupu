<template>
  <main class="page">
    <div class="shell">
      <header class="nav">
        <h1>族谱系统</h1>
        <nav>
          <RouterLink to="/members">成员</RouterLink>
          <RouterLink to="/ocr">OCR导入</RouterLink>
          <RouterLink to="/exports">导出</RouterLink>
        </nav>
      </header>

      <RouterView />
    </div>
  </main>
</template>
