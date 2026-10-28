--[[ Lenslie – wtyczka do Lightroom Classic.
     Usługa publikowania: każda kolekcja to galeria w Lenslie. ]]

return {
	LrSdkVersion = 10.0,
	LrSdkMinimumVersion = 6.0,

	LrToolkitIdentifier = 'com.lenslie.lightroom',
	LrPluginName = 'Lenslie',
	LrPluginInfoUrl = 'https://www.lenslie.com/panel/lightroom',

	LrExportServiceProvider = {
		title = 'Lenslie',
		file = 'LenslieServiceProvider.lua',
	},

	VERSION = { major = 1, minor = 0, revision = 1, build = 2 },
}
