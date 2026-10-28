--[[ Lenslie – usługa publikowania dla Lightroom Classic.
     Kolekcja w usłudze = galeria w Lenslie. „Publikuj” wysyła oryginał (ustawienia z okna eksportu)
     i lżejszą wersję do oglądania (2048 px), tak jak wgrywanie w panelu. ]]

local LrView = import 'LrView'
local LrBinding = import 'LrBinding'
local LrDialogs = import 'LrDialogs'
local LrTasks = import 'LrTasks'
local LrErrors = import 'LrErrors'
local LrHttp = import 'LrHttp'
local LrPrefs = import 'LrPrefs'
local LrPathUtils = import 'LrPathUtils'
local LrFileUtils = import 'LrFileUtils'
local LrExportSession = import 'LrExportSession'
local LrApplication = import 'LrApplication'

local API = require 'LenslieAPI'
local t = API.t

local provider = {}

-- ===== Rodzaj usługi =====

provider.supportsIncrementalPublish = 'only'
provider.small_icon = 'icon.png'
provider.hideSections = { 'exportLocation', 'fileNaming', 'video', 'postProcessing' }
provider.allowFileFormats = { 'JPEG' }
provider.allowColorSpaces = { 'sRGB' }
provider.hidePrintResolution = true
provider.canExportVideo = false
provider.supportsCustomSortOrder = false

provider.exportPresetFields = {
	{ key = 'token', default = '' },
	{ key = 'email', default = '' },
}

provider.titleForPublishedCollection = t('Galeria', 'Gallery')
provider.titleForPublishedCollection_standalone = t('Galeria', 'Gallery')
provider.titleForPublishedCollectionSet = t('Folder', 'Folder')
provider.titleForGoToPublishedCollection = t('Otwórz galerię w Lenslie', 'Open gallery in Lenslie')
provider.titleForGoToPublishedPhoto = t('Otwórz galerię w Lenslie', 'Open gallery in Lenslie')

function provider.getCollectionBehaviorInfo(publishSettings)
	return {
		defaultCollectionName = t('Nowa galeria', 'New gallery'),
		defaultCollectionCanBeDeleted = true,
		canAddCollection = true,
		maxCollectionSetDepth = 0,
	}
end

-- Zawsze JPEG w sRGB – tak wyświetlają przeglądarki i telefony klientów
function provider.updateExportSettings(exportSettings)
	exportSettings.LR_format = 'JPEG'
	exportSettings.LR_export_colorSpace = 'sRGB'
end

-- ===== Konto Lenslie (okno ustawień usługi) =====

local function setStatus(props)
	if props.token and props.token ~= '' then
		props.status = t('Zalogowano jako ', 'Signed in as ') .. (props.email or '')
		props.signedIn = true
	else
		props.status = t('Nie zalogowano. Wpisz e-mail i hasło do Lenslie.', 'Not signed in. Enter your Lenslie e-mail and password.')
		props.signedIn = false
	end
end

local function signIn(props)
	props.busy = true
	props.status = t('Logowanie…', 'Signing in…')
	local res, err = API.request('POST', '/api/lr/login', nil, {
		email = props.email or '',
		password = props.password or '',
		device = 'Lightroom Classic',
	})
	props.busy = false
	if not res then
		setStatus(props)
		LrDialogs.message(t('Nie udało się zalogować', 'Could not sign in'), err, 'critical')
		return
	end
	LrPrefs.prefsForPlugin().lang = res.lang == 'en' and 'en' or 'pl'
	props.token = res.token
	props.email = res.email
	props.password = ''
	setStatus(props)
end

function provider.startDialog(props)
	props.password = ''
	props.busy = false
	setStatus(props)
	-- Sprawdzamy, czy zapisany klucz nadal działa (np. po wylogowaniu w panelu)
	if props.token ~= '' then
		LrTasks.startAsyncTask(function()
			local res, _, status = API.request('GET', '/api/lr/me', props.token)
			if not res and status == 401 then
				props.token = ''
				setStatus(props)
			end
		end)
	end
end

function provider.sectionsForTopOfDialog(f, props)
	local bind = LrView.bind
	local share = LrView.share
	return {
		{
			title = t('Konto Lenslie', 'Lenslie account'),
			synopsis = bind 'status',

			f:row {
				f:static_text { title = bind 'status', fill_horizontal = 1, font = '<system/bold>' },
			},
			f:row {
				f:static_text { title = 'E-mail:', alignment = 'right', width = share 'lenslieLabel' },
				f:edit_field { value = bind 'email', width_in_chars = 30, immediate = true },
			},
			f:row {
				visible = LrBinding.negativeOfKey 'signedIn',
				f:static_text { title = t('Hasło:', 'Password:'), alignment = 'right', width = share 'lenslieLabel' },
				f:password_field { value = bind 'password', width_in_chars = 30, immediate = true },
			},
			f:row {
				f:static_text { title = '', width = share 'lenslieLabel' },
				f:push_button {
					title = t('Zaloguj', 'Sign in'),
					enabled = LrBinding.negativeOfKey 'busy',
					action = function()
						LrTasks.startAsyncTask(function() signIn(props) end)
					end,
				},
				f:push_button {
					title = t('Wyloguj', 'Sign out'),
					enabled = bind 'signedIn',
					action = function()
						props.token = ''
						setStatus(props)
					end,
				},
				f:push_button {
					title = t('Załóż konto', 'Create account'),
					action = function() LrHttp.openUrlInBrowser(API.base .. '/rejestracja') end,
				},
			},
			f:row {
				f:static_text {
					title = t(
						'Każda kolekcja w tej usłudze to osobna galeria w Lenslie. Utwórz kolekcję (np. „Ślub Anny i Marka”), przeciągnij do niej zdjęcia i kliknij „Publikuj”. Galerię opublikujesz dla klienta w panelu Lenslie.',
						'Each collection in this service is a separate Lenslie gallery. Create a collection (e.g. “Anna & Mark wedding”), drag photos into it and click “Publish”. Publish the gallery for your client in the Lenslie dashboard.'
					),
					height_in_lines = 3,
					width_in_chars = 60,
					fill_horizontal = 1,
				},
			},
		},
	}
end

-- ===== Publikowanie =====

local function requireToken(settings)
	if not settings.token or settings.token == '' then
		LrErrors.throwUserError(t(
			'Najpierw zaloguj się do Lenslie: kliknij prawym przyciskiem na „Lenslie” w panelu Publikuj → Edytuj ustawienia.',
			'Sign in to Lenslie first: right-click “Lenslie” in the Publish Services panel → Edit Settings.'
		))
	end
	return settings.token
end

-- Ustawienia lżejszej wersji do oglądania w galerii (jak w panelu: dłuższy bok 2048 px)
local function webSettings(folder)
	return {
		LR_format = 'JPEG',
		LR_jpeg_quality = 0.82,
		LR_export_colorSpace = 'sRGB',
		LR_size_doConstrain = true,
		LR_size_doNotEnlarge = true,
		LR_size_resizeType = 'wh',
		LR_size_maxWidth = 2048,
		LR_size_maxHeight = 2048,
		LR_size_units = 'pixels',
		LR_size_resolution = 72,
		LR_size_resolutionUnits = 'inch',
		LR_outputSharpeningOn = true,
		LR_outputSharpeningMedia = 'screen',
		LR_outputSharpeningLevel = 2,
		LR_minimizeEmbeddedMetadata = true,
		LR_removeLocationMetadata = true,
		LR_useWatermark = false,
		LR_export_destinationType = 'specificFolder',
		LR_export_destinationPathPrefix = folder,
		LR_export_useSubfolder = false,
		LR_collisionHandling = 'rename',
		LR_renamingTokensOn = false,
		LR_reimportExportedPhoto = false,
		LR_includeVideoFiles = false,
	}
end

function provider.processRenderedPhotos(functionContext, exportContext)
	local session = exportContext.exportSession
	local settings = exportContext.propertyTable
	local token = requireToken(settings)
	local info = exportContext.publishedCollectionInfo
	local count = session:countRenditions()

	local progress = exportContext:configureProgress {
		title = count > 1 and (t('Wysyłanie do Lenslie: ', 'Uploading to Lenslie: ') .. count .. t(' zdjęć', ' photos'))
			or t('Wysyłanie zdjęcia do Lenslie', 'Uploading a photo to Lenslie'),
	}

	-- 1. Galeria: przy pierwszej publikacji kolekcji tworzymy ją w Lenslie
	local galleryId = info.remoteId
	local galleryUrl
	if not galleryId or galleryId == '' then
		local res, err = API.request('POST', '/api/lr/galleries', token, { title = info.name })
		if not res then LrErrors.throwUserError(err) end
		galleryId = res.id
		galleryUrl = res.url
		session:recordRemoteCollectionId(galleryId)
		session:recordRemoteCollectionUrl(galleryUrl)
	end

	-- Nazwy zdjęć już obecnych w galerii (żeby nowe zdjęcie o tej samej nazwie nie nadpisało innego)
	local taken = {}
	pcall(function()
		for _, p in ipairs(exportContext.publishedCollection:getPublishedPhotos()) do
			local id = p:getRemoteId()
			if id then taken[id] = true end
		end
	end)

	-- 2. Wersje do oglądania (2048 px) – renderowane osobno, do folderu tymczasowego
	local tempDir = LrPathUtils.child(LrPathUtils.getStandardFilePath('temp'), 'lenslie-' .. tostring(os.time()) .. '-' .. tostring(math.random(100000)))
	LrFileUtils.createAllDirectories(tempDir)
	local webPaths = {}
	local okPhotos, photos = pcall(function() return session:photosToExport() end)
	if okPhotos and photos and #photos > 0 then
		local webSession = LrExportSession {
			photosToExport = photos,
			exportSettings = webSettings(tempDir),
		}
		progress:setCaption(t('Przygotowuję podglądy do galerii…', 'Preparing gallery previews…'))
		local w = 0
		for _, r in webSession:renditions() do
			if progress:isCanceled() then break end
			local ok, path = r:waitForRender()
			if ok then webPaths[r.photo.localIdentifier] = path end
			w = w + 1
			progress:setPortionComplete(0.3 * w / count)
		end
	end

	-- 3. Oryginały + podglądy do Lenslie
	local fatal
	local needsWatermark = false
	local i = 0
	for _, rendition in session:renditions { stopIfCanceled = true } do
		i = i + 1
		if fatal then
			rendition:uploadFailed(fatal)
		else
			progress:setCaption(t('Wysyłanie ', 'Uploading ') .. i .. ' / ' .. count)
			local ok, pathOrMsg = rendition:waitForRender()
			if progress:isCanceled() then break end
			if not ok then
				rendition:uploadFailed(pathOrMsg)
			else
				-- Nazwa pliku w galerii: przy ponownej publikacji ta sama co wcześniej
				local base = rendition.publishedPhotoId
				if not base or base == '' then
					base = LrPathUtils.removeExtension(LrPathUtils.leafName(pathOrMsg))
					if taken[base] then
						local n = 2
						while taken[base .. '-' .. n] do n = n + 1 end
						base = base .. '-' .. n
					end
				end
				taken[base] = true

				local res, err, _, code = API.request('POST', '/api/lr/upload', token, {
					gallery = galleryId,
					files = { { name = base .. '.jpg', type = 'image/jpeg', size = API.fileSize(pathOrMsg) } },
				})
				if not res then
					rendition:uploadFailed(err)
					-- Brak miejsca, wygasła galeria albo wylogowanie: pozostałych zdjęć nie ma sensu wysyłać
					if code == 'LIMIT' or code == 'DRAFT_LIMIT' or code == 'EXPIRED' or err:find('Zaloguj') or err:find('Sign in') then
						fatal = err
					end
				else
					local up = res.uploads[1]
					galleryUrl = res.url or galleryUrl
					local web = webPaths[rendition.photo.localIdentifier] or pathOrMsg
					local okOrig, errOrig = API.putFile(up.originalUrl, pathOrMsg, 'image/jpeg')
					local okWeb, errWeb = true, nil
					if okOrig then okWeb, errWeb = API.putFile(up.webUrl, web, 'image/jpeg') end
					if okOrig and okWeb then
						rendition:recordPublishedPhotoId(up.id)
						if res.watermark then needsWatermark = true end
						if galleryUrl then rendition:recordPublishedPhotoUrl(galleryUrl) end
					else
						rendition:uploadFailed(errOrig or errWeb)
					end
				end
			end
			progress:setPortionComplete(0.3 + 0.7 * i / count)
		end
	end

	LrFileUtils.delete(tempDir)
	progress:done()
	-- Galeria ze znakiem wodnym: znak nakłada panel Lenslie w przeglądarce – otwieramy go,
	-- a do tego czasu klient nie widzi nowych zdjęć
	if needsWatermark and galleryUrl then
		LrHttp.openUrlInBrowser(galleryUrl)
	end
	if fatal then LrErrors.throwUserError(fatal) end
end

-- ===== Zmiany w kolekcjach =====

-- Usunięte z kolekcji = usunięte z galerii
function provider.deletePhotosFromPublishedCollection(publishSettings, arrayOfPhotoIds, deletedCallback, localCollectionId)
	local token = requireToken(publishSettings)
	local collection = LrApplication.activeCatalog():getPublishedCollectionByLocalIdentifier(localCollectionId)
	local galleryId = collection and collection:getRemoteId()
	if galleryId and #arrayOfPhotoIds > 0 then
		local res, err, status = API.request('POST', '/api/lr/photos', token, { gallery = galleryId, ids = arrayOfPhotoIds })
		-- Galeria usunięta w Lenslie: zdjęć i tak już nie ma
		if not res and status ~= 404 then LrErrors.throwUserError(err) end
	end
	for _, id in ipairs(arrayOfPhotoIds) do
		deletedCallback(id)
	end
end

function provider.renamePublishedCollection(publishSettings, info)
	if info.remoteId and publishSettings.token ~= '' then
		API.request('POST', '/api/lr/rename', publishSettings.token, { id = info.remoteId, title = info.name })
	end
end

-- Usunięcie kolekcji nie kasuje galerii w Lenslie (klient może jej jeszcze potrzebować)
function provider.deletePublishedCollection(publishSettings, info)
	if info.remoteId then
		LrDialogs.message(
			t('Galeria w Lenslie zostaje', 'The Lenslie gallery stays'),
			t('Kolekcja zniknie z Lightrooma, ale galeria „', 'The collection is removed from Lightroom, but the gallery “') .. (info.name or '') ..
				t('” i jej zdjęcia zostają w Lenslie. Jeśli chcesz, usuń ją w panelu Lenslie.', '” and its photos stay in Lenslie. Delete it in the Lenslie dashboard if you want.'),
			'info'
		)
	end
end

return provider
