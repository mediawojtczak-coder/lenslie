--[[ Minimalny JSON (kodowanie i dekodowanie) dla Lightrooma – bez zewnętrznych bibliotek. Zgodny z Lua 5.1. ]]

local JSON = {}

local escapes = { ['"'] = '\\"', ['\\'] = '\\\\', ['\b'] = '\\b', ['\f'] = '\\f', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t' }

local function escapeString(s)
	return '"' .. s:gsub('[%c"\\]', function(c)
		return escapes[c] or string.format('\\u%04x', c:byte())
	end) .. '"'
end

local function isArray(t)
	local n = 0
	for k in pairs(t) do
		if type(k) ~= 'number' or k < 1 or math.floor(k) ~= k then return false end
		n = n + 1
	end
	for i = 1, n do
		if t[i] == nil then return false end
	end
	return true
end

local encodeValue

encodeValue = function(v)
	local tv = type(v)
	if v == nil then return 'null' end
	if tv == 'boolean' then return v and 'true' or 'false' end
	if tv == 'number' then
		if v ~= v or v == math.huge or v == -math.huge then return 'null' end
		if math.floor(v) == v and math.abs(v) < 1e15 then return string.format('%d', v) end
		return string.format('%.14g', v)
	end
	if tv == 'string' then return escapeString(v) end
	if tv == 'table' then
		local parts = {}
		if isArray(v) then
			for i = 1, #v do parts[#parts + 1] = encodeValue(v[i]) end
			return '[' .. table.concat(parts, ',') .. ']'
		end
		for k, val in pairs(v) do
			parts[#parts + 1] = escapeString(tostring(k)) .. ':' .. encodeValue(val)
		end
		return '{' .. table.concat(parts, ',') .. '}'
	end
	error('JSON: nie można zakodować typu ' .. tv)
end

function JSON.encode(v)
	return encodeValue(v)
end

-- ===== Dekodowanie =====

local function codepointToUtf8(n)
	if n < 0x80 then return string.char(n) end
	if n < 0x800 then return string.char(0xC0 + math.floor(n / 0x40), 0x80 + n % 0x40) end
	if n < 0x10000 then
		return string.char(0xE0 + math.floor(n / 0x1000), 0x80 + math.floor(n / 0x40) % 0x40, 0x80 + n % 0x40)
	end
	return string.char(0xF0 + math.floor(n / 0x40000), 0x80 + math.floor(n / 0x1000) % 0x40, 0x80 + math.floor(n / 0x40) % 0x40, 0x80 + n % 0x40)
end

local decodeValue

local function skip(s, i)
	local _, e = s:find('^[ \n\r\t]*', i)
	return e + 1
end

local function decodeString(s, i)
	-- i wskazuje na otwierający cudzysłów
	local out = {}
	local j = i + 1
	while true do
		local c = s:sub(j, j)
		if c == '' then error('JSON: niezakończony tekst') end
		if c == '"' then return table.concat(out), j + 1 end
		if c == '\\' then
			local e = s:sub(j + 1, j + 1)
			local map = { ['"'] = '"', ['\\'] = '\\', ['/'] = '/', b = '\b', f = '\f', n = '\n', r = '\r', t = '\t' }
			if map[e] then
				out[#out + 1] = map[e]
				j = j + 2
			elseif e == 'u' then
				local n = tonumber(s:sub(j + 2, j + 5), 16)
				if not n then error('JSON: zły znak \\u') end
				j = j + 6
				-- para zastępcza (znaki spoza BMP, np. emoji)
				if n >= 0xD800 and n <= 0xDBFF and s:sub(j, j + 1) == '\\u' then
					local lo = tonumber(s:sub(j + 2, j + 5), 16)
					if lo and lo >= 0xDC00 and lo <= 0xDFFF then
						n = 0x10000 + (n - 0xD800) * 0x400 + (lo - 0xDC00)
						j = j + 6
					end
				end
				out[#out + 1] = codepointToUtf8(n)
			else
				error('JSON: zła sekwencja \\' .. e)
			end
		else
			local k = s:find('["\\]', j)
			if not k then error('JSON: niezakończony tekst') end
			out[#out + 1] = s:sub(j, k - 1)
			j = k
		end
	end
end

decodeValue = function(s, i)
	i = skip(s, i)
	local c = s:sub(i, i)
	if c == '{' then
		local obj = {}
		i = skip(s, i + 1)
		if s:sub(i, i) == '}' then return obj, i + 1 end
		while true do
			i = skip(s, i)
			if s:sub(i, i) ~= '"' then error('JSON: oczekiwano klucza') end
			local key
			key, i = decodeString(s, i)
			i = skip(s, i)
			if s:sub(i, i) ~= ':' then error('JSON: oczekiwano dwukropka') end
			obj[key], i = decodeValue(s, i + 1)
			i = skip(s, i)
			local d = s:sub(i, i)
			if d == '}' then return obj, i + 1 end
			if d ~= ',' then error('JSON: oczekiwano przecinka') end
			i = i + 1
		end
	elseif c == '[' then
		local arr = {}
		i = skip(s, i + 1)
		if s:sub(i, i) == ']' then return arr, i + 1 end
		while true do
			arr[#arr + 1], i = decodeValue(s, i)
			i = skip(s, i)
			local d = s:sub(i, i)
			if d == ']' then return arr, i + 1 end
			if d ~= ',' then error('JSON: oczekiwano przecinka') end
			i = i + 1
		end
	elseif c == '"' then
		return decodeString(s, i)
	elseif s:sub(i, i + 3) == 'true' then
		return true, i + 4
	elseif s:sub(i, i + 4) == 'false' then
		return false, i + 5
	elseif s:sub(i, i + 3) == 'null' then
		return nil, i + 4
	else
		local num = s:match('^-?%d+%.?%d*[eE]?[-+]?%d*', i)
		if not num or num == '' then error('JSON: nieoczekiwany znak') end
		return tonumber(num), i + #num
	end
end

-- Zwraca wartość albo nil i komunikat błędu
function JSON.decode(s)
	if type(s) ~= 'string' or s == '' then return nil, 'pusta odpowiedź' end
	local ok, value = pcall(function()
		local v = decodeValue(s, 1)
		return v
	end)
	if ok then return value end
	return nil, value
end

return JSON
