--[[ Połączenie z Lenslie: logowanie, galerie, wysyłanie zdjęć. ]]

local LrHttp = import 'LrHttp'
local LrPrefs = import 'LrPrefs'
local LrFileUtils = import 'LrFileUtils'

local JSON = require 'JSON'

local API = {}

API.base = 'https://www.lenslie.com'

-- Język wtyczki: taki jak w koncie Lenslie (zapamiętany przy logowaniu), domyślnie polski
function API.lang()
	local prefs = LrPrefs.prefsForPlugin()
	return prefs.lang == 'en' and 'en' or 'pl'
end

function API.t(pl, en)
	return API.lang() == 'en' and en or pl
end

local t = API.t

local function statusOf(headers)
	return headers and tonumber(headers.status) or 0
end

local function headerValue(headers, name)
	if not headers then return nil end
	for _, h in ipairs(headers) do
		if type(h) == 'table' and h.field and h.field:lower() == name then return h.value end
	end
	return nil
end

-- Zapytanie do Lenslie. Zwraca dane albo nil, komunikat, kod HTTP, kod błędu
function API.request(method, path, token, body, retried)
	local headers = {
		{ field = 'Content-Type', value = 'application/json' },
		{ field = 'Accept', value = 'application/json' },
		{ field = 'Accept-Language', value = API.lang() },
	}
	if token and token ~= '' then
		headers[#headers + 1] = { field = 'Authorization', value = 'Bearer ' .. token }
	end

	local resBody, resHeaders
	if method == 'GET' then
		resBody, resHeaders = LrHttp.get(API.base .. path, headers, 60)
	else
		resBody, resHeaders = LrHttp.post(API.base .. path, body and JSON.encode(body) or '{}', headers, method, 120)
	end

	local status = statusOf(resHeaders)
	-- Przekierowanie na inny adres strony (np. bez „www”): zapamiętujemy go i ponawiamy raz
	if status >= 300 and status < 400 and not retried then
		local loc = headerValue(resHeaders, 'location')
		local base = loc and loc:match('^(https://[^/]+)')
		if base and base ~= API.base then
			API.base = base
			return API.request(method, path, token, body, true)
		end
	end
	if status == 0 then
		local why = resHeaders and resHeaders.error and resHeaders.error.name or ''
		return nil, t('Brak połączenia z Lenslie. Sprawdź internet i spróbuj ponownie.', 'Cannot reach Lenslie. Check your internet connection and try again.') .. (why ~= '' and (' (' .. why .. ')') or ''), 0
	end

	local data = JSON.decode(resBody or '')
	if status < 200 or status >= 300 then
		local msg = data and data.error or (t('Błąd serwera Lenslie', 'Lenslie server error') .. ' (' .. status .. ').')
		return nil, msg, status, data and data.code
	end
	if data == nil then
		return nil, t('Nieoczekiwana odpowiedź serwera Lenslie.', 'Unexpected response from Lenslie.'), status
	end
	return data
end

-- Wysyła plik prosto do magazynu zdjęć (podpisany adres). Zwraca true albo false i komunikat.
function API.putFile(url, path, contentType)
	local f = io.open(path, 'rb')
	if not f then return false, t('Nie można odczytać pliku ', 'Cannot read file ') .. path end
	local data = f:read('*a')
	f:close()
	local _, headers = LrHttp.post(url, data, { { field = 'Content-Type', value = contentType } }, 'PUT', 600, #data)
	local status = statusOf(headers)
	if status >= 200 and status < 300 then return true end
	if status == 0 then
		return false, t('Przerwane połączenie podczas wysyłania zdjęcia.', 'The connection dropped while uploading a photo.')
	end
	return false, t('Nie udało się zapisać zdjęcia', 'Could not store the photo') .. ' (' .. status .. ').'
end

function API.fileSize(path)
	local attrs = LrFileUtils.fileAttributes(path)
	return attrs and attrs.fileSize or 0
end

return API
