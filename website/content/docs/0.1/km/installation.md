---
title: ការដំឡើង
group: ចាប់ផ្តើម
section: 1
order: 1
---
Kroma Studio ជាកម្មវិធីកុំព្យូទ័រសម្រាប់ **macOS (Apple silicon)**, **Windows (64-bit)** និង **Linux (x64)**។ កំណែនីមួយៗត្រូវបានចេញផ្សាយនៅ [GitHub Releases](https://github.com/Heang-Dev/kroma/releases/latest)។ បើកកំណែចុងក្រោយ រំកិលចុះទៅ **Assets** ហើយទាញយកឯកសារសម្រាប់កុំព្យូទ័ររបស់អ្នក។

## តើត្រូវទាញយកឯកសារណា?

| កុំព្យូទ័ររបស់អ្នក | ឯកសារ | ឧទាហរណ៍ឈ្មោះ |
|---|---|---|
| Mac ដែលមានឈីប M1, M2, M3 ឬថ្មីជាងនេះ | `.dmg` | `Kroma Studio-0.1.3-arm64.dmg` |
| Windows 10 ឬ 11 (64-bit) | កម្មវិធីដំឡើង `.exe` | `Kroma-Studio-Setup-0.1.3.exe` |
| Linux គ្រប់ distro | `.AppImage` | `Kroma-Studio-0.1.3-x86_64.AppImage` |
| Ubuntu, Debian និងស្រដៀងគ្នា | `.deb` | `Kroma-Studio-0.1.3-amd64.deb` |

នៅលើ Linux បើមិនប្រាកដ សូមយក AppImage។ វាអាចធ្វើបច្ចុប្បន្នភាពដោយខ្លួនឯងបាន ចំណែក `.deb` ត្រូវការពាក្យសម្ងាត់របស់អ្នករាល់ពេលធ្វើបច្ចុប្បន្នភាព (មើល [ការធ្វើបច្ចុប្បន្នភាព](updates))។

## តម្រូវការប្រព័ន្ធ

| | អ្វីដែលអ្នកត្រូវការ |
|---|---|
| Mac | Apple silicon (M1 ឬថ្មីជាងនេះ)។ Mac ដែលប្រើ Intel មិនទាន់គាំទ្រនៅឡើយទេ។ |
| Windows | Windows 10 ឬ 11, 64-bit |
| Linux | កុំព្យូទ័រ 64-bit (x64) |
| អេក្រង់ | បង្អួចមានទំហំយ៉ាងតិច 1100 × 700 ភីកសែល ដូច្នេះអេក្រង់ laptop ឬធំជាងនេះ |
| ទំហំថាស | ប្រហែល 300 MB សម្រាប់កម្មវិធីលើ Mac ហើយច្រើនជាងនេះបន្តិចលើ Windows និង Linux (ព្រោះឧបករណ៍វីដេអូនៅក្នុងកម្មវិធីស្រាប់)។ បូកនឹងកន្លែងសម្រាប់វីដេអូរបស់អ្នក។ |
| អ៊ីនធឺណិត | ត្រូវការសម្រាប់ទាញយកវីដេអូ និងសេវា AI |

អ្នកមិនត្រូវការកុំព្យូទ័រខ្លាំងទេ។ ការបំប្លែងសំឡេងទៅជាអក្សរ ការបកប្រែ និងសំឡេងរហ័ស ដំណើរការលើ cloud ទាំងអស់។ មានតែមុខងារបន្ថែមពីរប៉ុណ្ណោះដែលធ្វើការធ្ងន់លើកុំព្យូទ័ររបស់អ្នក៖ ការដកសំឡេងនិយាយដើមចេញ និងការដំណើរការ [ម៉ាស៊ីនសំឡេង](voice-engine) ដោយគ្មាន GPU។

## macOS

### ដំឡើង

1. បើកឯកសារ `.dmg` ដែលអ្នកបានទាញយក។
2. អូស **Kroma Studio** ទៅដាក់លើថត **Applications** ក្នុងបង្អួចដែលបើកឡើង។
3. Eject ថាសនោះ (រូបថាសឈ្មោះ Kroma Studio នៅរបារចំហៀងរបស់ Finder)។
4. បើក **Kroma Studio** ពី Applications ឬ Launchpad។

សូមបើក Kroma ពី **Applications** ជានិច្ច កុំបើកពីក្នុង `.dmg`។ Kroma អាចធ្វើបច្ចុប្បន្នភាពខ្លួនឯងបាន លុះត្រាតែវាអាចជំនួសកម្មវិធីនៅកន្លែងដែលបានដំឡើង។

### «Kroma Studio is damaged and can't be opened»

Kroma មិនទាន់មានហត្ថលេខាវិញ្ញាបនបត្ររបស់ Apple នៅឡើយទេ ដូច្នេះ macOS អាចប្រាប់ថាកម្មវិធីខូច ឬថាវាមិនអាចពិនិត្យរកមេរោគបាន។ តាមពិតកម្មវិធីគ្មានបញ្ហាទេ។ បើក **Terminal** (នៅក្នុង Applications → Utilities) បិទភ្ជាប់បន្ទាត់នេះ ហើយចុច Return៖

```bash
xattr -cr "/Applications/Kroma Studio.app"
```

វាដកសញ្ញា «ទាញយកពីអ៊ីនធឺណិត» ដែល macOS បានដាក់។ បន្ទាប់មកបើក Kroma ម្តងទៀត។ អ្នកត្រូវធ្វើតែម្តងប៉ុណ្ណោះ៖ ការធ្វើបច្ចុប្បន្នភាពដែល Kroma ដំឡើងដោយខ្លួនឯង ដកសញ្ញានេះឱ្យអ្នកស្រាប់។

### ដំឡើង FFmpeg និង yt-dlp

នៅលើ Mac, Kroma ប្រើឧបករណ៍វីដេអូពី [Homebrew](https://brew.sh)។ FFmpeg របស់ Homebrew អាចប្រើឈីបវីដេអូរបស់ Mac ដែលធ្វើឱ្យការនាំចេញលឿនជាងច្រើន។ បើអ្នកមិនទាន់មាន Homebrew សូមដំឡើងវាពី [brew.sh](https://brew.sh) រួចដំណើរការ៖

```bash
brew install ffmpeg yt-dlp
```

អ្នកមិនចាំបាច់ប្រាប់ Kroma ថាវានៅឯណាទេ។ វាស្វែងរកក្នុងថតរបស់ Homebrew (`/opt/homebrew/bin` និង `/usr/local/bin`) ដោយខ្លួនឯង។

## Windows

1. ដំណើរការ `Kroma-Studio-Setup-<version>.exe`។
2. កម្មវិធីដំឡើងមិនទាន់មានហត្ថលេខាកូដនៅឡើយទេ ដូច្នេះ Windows អាចបង្ហាញ **«Windows protected your PC»**។ ចុច **More info** រួចចុច **Run anyway**។
3. ធ្វើតាមជំហាន។ អ្នកអាចប្តូរថតដំឡើងបាន បើចង់។ Kroma ដំឡើងសម្រាប់តែគណនី Windows របស់អ្នក ដូច្នេះវាមិនត្រូវការសិទ្ធិ administrator ទេ។
4. បើក **Kroma Studio** ពីម៉ឺនុយ Start ឬរូបតំណាងនៅលើ desktop។

FFmpeg និង yt-dlp មកជាមួយកម្មវិធីស្រាប់។ មិនចាំបាច់ដំឡើងអ្វីទៀតទេ។

## Linux

### AppImage

ធ្វើឱ្យឯកសារអាចដំណើរការបាន រួចបើកវា៖

```bash
chmod +x Kroma-Studio-*.AppImage
./Kroma-Studio-*.AppImage
```

អ្នកក៏អាចចុចខាងស្តាំលើឯកសារក្នុងកម្មវិធីគ្រប់គ្រងឯកសារ បើក **Properties** ហើយបើក «Allow executing file as program» ផងដែរ។

បើ AppImage មិនព្រមបើកលើ Ubuntu ថ្មីៗ សូមដំឡើងបណ្ណាល័យ FUSE ដែល AppImage ត្រូវការ៖

```bash
sudo apt install libfuse2t64
```

(លើ Ubuntu 22.04 និងចាស់ជាងនេះ កញ្ចប់នេះឈ្មោះ `libfuse2`។)

### .deb

ចុចពីរដងលើឯកសារ ដើម្បីបើកវាក្នុងកម្មវិធីដំឡើងរបស់អ្នក ឬដំណើរការ៖

```bash
sudo apt install ./Kroma-Studio-*.deb
```

កំណែ Linux ទាំងពីរមាន FFmpeg និង yt-dlp ស្រាប់។

## អ្វីដែលមកជាមួយ Kroma

| ឧបករណ៍ | តួនាទី | Mac | Windows និង Linux |
|---|---|---|---|
| FFmpeg | អានវីដេអូ កាត់សំឡេងសម្រាប់បំប្លែងទៅជាអក្សរ និងនាំចេញវីដេអូចុងក្រោយ | ដំឡើងតាម Homebrew | មានស្រាប់ |
| yt-dlp | ទាញយកវីដេអូពីតំណ | ដំឡើងតាម Homebrew | មានស្រាប់ |
| uv | សម្រាប់តែការដកសំឡេងនិយាយដើមចេញពីវីដេអូ | ជម្រើស | ជម្រើស |

ដើម្បីពិនិត្យថា Kroma រកឃើញអ្វីខ្លះ សូមបើក **Settings → About**។ ប្រអប់ **Tools** បង្ហាញ **Installed** ឬ **Missing** សម្រាប់ឧបករណ៍នីមួយៗ និងពាក្យបញ្ជាដំឡើងសម្រាប់អ្វីដែលខ្វះ។ បើខ្វះ FFmpeg ឬ yt-dlp របារក្រហមមួយនៅខាងលើកម្មវិធីកែក៏ប្រាប់ដែរ ជាមួយពាក្យបញ្ជាដែលត្រូវដំណើរការ។

នៅលើ Windows និង Linux, Kroma ប្រើច្បាប់ចម្លងផ្ទាល់ខ្លួនមុន។ នៅលើ Mac វាប្រើរបស់ Homebrew មុន។

## ជម្រើស៖ ការដកសំឡេងនិយាយដើមចេញ

Kroma អាចដកសំឡេងនិយាយដើមចេញពីវីដេអូ ហើយរក្សាតន្ត្រី និងសំឡេងបរិយាកាសទុក ដើម្បីកុំឱ្យសំឡេងបញ្ចូលរបស់អ្នកនិយាយជាន់សំឡេងដើម។ មុខងារនេះប្រើ [uv](https://docs.astral.sh/uv/)។ លើកដំបូងដែលអ្នកប្រើ វាទាញយកឧបករណ៍ និងម៉ូដែលដកសំឡេង ដូច្នេះវាចំណាយពេលយូរជាង។

| ប្រព័ន្ធ | ពាក្យបញ្ជា |
|---|---|
| Mac | `brew install uv` |
| Windows | `winget install astral-sh.uv` |
| Linux | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |

Settings → About បង្ហាញថា uv បានដំឡើងហើយឬនៅ។

## កន្លែងដែល Kroma ទុកឯកសាររបស់អ្នក

| អ្វី | Mac | Windows និង Linux |
|---|---|---|
| បណ្ណាល័យ (គម្រោង វីដេអូទាញយក វីដេអូនាំចេញ សំឡេង) | `Movies/Kroma Studio` | `Videos/Kroma Studio` |
| ការកំណត់ និង key | `~/Library/Application Support/Kroma Studio` | `%APPDATA%\Kroma Studio` លើ Windows, `~/.config/Kroma Studio` លើ Linux |

មើល [គម្រោង និងឯកសារ](projects-and-files) សម្រាប់ព័ត៌មានបន្ថែម។

## ការលុបកម្មវិធី

- **Mac៖** បិទ Kroma រួចអូស **Kroma Studio** ពី Applications ទៅធុងសំរាម។
- **Windows៖** បើក **Settings → Apps → Installed apps** រក **Kroma Studio** ហើយជ្រើស **Uninstall**។
- **Linux AppImage៖** លុបឯកសារ `.AppImage`។
- **Linux .deb៖** ដំណើរការ `sudo apt remove kroma-studio`។

ការលុបកម្មវិធីមិនប៉ះពាល់វីដេអូ និងគម្រោងរបស់អ្នកទេ។ ដើម្បីលុបទាំងអស់ សូមលុបថតបណ្ណាល័យ និងថតការកំណត់ក្នុងតារាងខាងលើផង។ ការលុបថតការកំណត់ ក៏លុប API key ដែលអ្នកបានរក្សាទុកដែរ។

## បន្ទាប់

[បន្ថែម key របស់អ្នក](configuration) [ស្គាល់កម្មវិធីកែ](the-editor) រួច[ធ្វើវីដេអូដំបូងរបស់អ្នក](first-video)។
