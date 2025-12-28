# Инструкции по сборке нативных приложений

## macOS

### Быстрая сборка

```bash
cd native-apps/macos
./build.sh
```

### Создание DMG

```bash
cd native-apps/macos
./package.sh
```

### Требования

- macOS 12.0 (Monterey) или новее
- Xcode Command Line Tools: `xcode-select --install`
- Swift 5.7+

### Ручная сборка

Если скрипты не работают, можно собрать вручную:

```bash
cd native-apps/macos

# Компиляция Swift
swiftc -o build/Muzic2.app/Contents/MacOS/Muzic2 \
    Muzic2/AppDelegate.swift \
    -target x86_64-apple-macosx12.0 \
    -framework Cocoa \
    -framework WebKit

# Создание структуры приложения
mkdir -p build/Muzic2.app/Contents/{MacOS,Resources}

# Копирование файлов
cp Muzic2/Info.plist build/Muzic2.app/Contents/
cp -R ../../public build/Muzic2.app/Contents/Resources/
```

## Windows

### Быстрая сборка

```batch
cd native-apps\windows
build.bat
```

### Требования

- Windows 10/11
- .NET 6.0 SDK
- Visual Studio 2022 (опционально, для удобства)

### Ручная сборка

```batch
cd native-apps\windows
dotnet publish -c Release -r win-x64 --self-contained false
```

### Включение PHP

Для создания полностью автономного приложения:

1. Скачайте PHP для Windows: https://windows.php.net/download/
2. Распакуйте в папку `php` в корне проекта
3. Модифицируйте `MainForm.cs`, чтобы использовать встроенный PHP

## Проблемы и решения

### macOS: "PHP не найден"

Приложение ищет PHP в стандартных местах. Если PHP установлен нестандартно:

1. Создайте симлинк: `sudo ln -s /path/to/php /usr/local/bin/php`
2. Или добавьте PHP в PATH

### Windows: "WebView2 не найден"

WebView2 Runtime должен быть установлен. Если его нет, приложение предложит скачать.

Скачать: https://developer.microsoft.com/microsoft-edge/webview2/

### macOS: Ошибка компиляции Swift

Убедитесь, что установлены Command Line Tools:
```bash
xcode-select --install
```

### Windows: Ошибка сборки .NET

Убедитесь, что установлен .NET SDK:
```batch
dotnet --version
```

Если не установлен, скачайте с: https://dotnet.microsoft.com/download

## Распространение

### macOS DMG

После выполнения `package.sh` будет создан файл `Muzic2.dmg` в корне проекта.

Пользователи могут просто открыть DMG и перетащить приложение в Applications.

### Windows установщик

Для создания установщика используйте:

1. **WiX Toolset** - для создания MSI
2. **Inno Setup** - для создания EXE установщика
3. **ClickOnce** - встроенный в Visual Studio

Пример WiX файла включен в `windows/Muzic2.wxs`.

## Размер приложения

Обратите внимание, что если вы копируете всю папку `tracks` с музыкой, размер приложения будет очень большим.

Рекомендуется:
- Либо не включать треки в приложение
- Либо создать механизм загрузки треков по требованию
- Либо предложить пользователям скопировать треки самостоятельно

