@echo off
rem Doble clic: revisa el Excel, regenera los datos del mapa, abre la vista previa y (si dices que si) lo publica.
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ===  Actualizar el mapa de los bonos  ===
echo.
echo  1. Revisando el Excel y generando los datos...
echo.
python herramientas\generar_datos.py
if errorlevel 1 (
  echo.
  echo  Hay ERRORES en el Excel ^(arriba se explica cada uno^). Corrigelos, guarda el Excel y vuelve a hacer doble clic.
  echo.
  pause
  exit /b 1
)
python herramientas\plano\puntos.py
echo.
echo  2. Abriendo la vista previa en el navegador. Revisa que todo este bien.
start "" "index.html"
echo.
git diff --quiet -- datos.js "plano/*/puntos.js"
if not errorlevel 1 (
  echo  No ha cambiado nada respecto a lo publicado.
  echo.
  pause
  exit /b 0
)
set /p RESP=  3. Publicar los cambios ahora? Escribe S y pulsa Intro (cualquier otra cosa = no):
if /i not "%RESP%"=="S" (
  echo  No se ha publicado. Los datos nuevos se quedan en tu ordenador.
  echo.
  pause
  exit /b 0
)
git add datos.js "plano/*/puntos.js"
git commit -m "Actualizar datos del mapa desde el Excel" >nul
git push
if errorlevel 1 (
  echo.
  echo  No se ha podido publicar ^(sin conexion o sin permiso en GitHub^). Pide ayuda con este mensaje.
) else (
  echo.
  echo  Publicado. En unos minutos se vera en la web.
)
echo.
pause
