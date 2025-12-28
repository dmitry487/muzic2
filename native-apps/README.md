# Нативные приложения Muzic2

Этот каталог содержит нативные приложения для macOS и Windows.

## Структура

- `macos/` - macOS приложение на Swift
- `windows/` - Windows приложение на C#

## Требования

### macOS
- Xcode 14.0 или новее
- macOS 12.0 (Monterey) или новее
- Swift 5.7+

### Windows
- Visual Studio 2022 или новее
- .NET 6.0 или новее
- Windows 10/11

## Сборка

### macOS

```bash
cd macos
./build.sh
```

Приложение будет собрано в `macos/build/Muzic2.app`

### Windows

```bash
cd windows
dotnet publish -c Release
```

Приложение будет собрано в `windows/bin/Release/net6.0-windows/publish/`

## Упаковка

### macOS (DMG)

```bash
cd macos
./package.sh
```

Создаст `Muzic2.dmg` в корне проекта.

### Windows (MSI/EXE)

```bash
cd windows
dotnet publish -c Release -p:PublishSingleFile=true
```

Или используйте Visual Studio для создания установщика через WiX Toolset.

