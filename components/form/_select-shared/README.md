# Select / MultiSelect ortak davranışları

Bu klasör, `CustomSelect` ve `CustomMultiSelect` tarafından paylaşılan arama ve
seçim koruma hook'larını ve bunların testlerini içerir. Bileşenler kendi klasörlerinde kalır.

## Servisten seçenek arama

Tekli seçimlerde `CustomSelect`, çoklu seçimlerde `CustomMultiSelect` kullanılır.
İkisi de Mantine bileşenlerini ve ortak `useSelectSearch` davranışını kullanır.

- Form alanlarını `useForm({ mode: 'uncontrolled' })`, `form.key` ve `form.getInputProps` ile bağlayın.
- Servis filtresini `onSearch` üzerinden güncelleyin. Bu callback yalnızca yazılan metni 300 ms debounce sonrasında alır.
- Arama için üst bileşenden `searchValue` geçmeyin. Metin bileşenin içinde anlık güncellenir; seçeneklerin yenilenmesi metni silmez.
- Servis filtre state'inde ayrıca debounce uygulamayın. `onSearch` ile alınan metni doğrudan sorgu DTO'suna aktarın.
- Seçim etiketi servis araması değildir. Seçim, temizleme ve dropdown kapanışı bekleyen aramayı iptal eder; aktif filtreyi boş metinle sıfırlar. Bileşenin kaldırılması da bekleyen çağrıyı iptal eder.
- `clearSearchOnChange={false}` kullanılan MultiSelect'te seçimden sonra arama korunur.
- Seçili seçeneklerin bilgileri ortak `useSelectedOptions` üzerinden korunur. Seçimle aynı anda servis sonuçları değişse de etiket kaybolmaz; güncel sonuçlardaki etiket ve `disabled` bilgisi önceliklidir.
- Sayfalarda yalnızca etiket korumak için ayrıca seçim önbelleği tutmayın. Düzenleme kaydının ilk etiketlerini sağlayan servis/model eşlemeleri ve iş kuralları sayfada kalır.
- `form.key` ile alan yeniden oluşturulduğunda seçim önbelleği ve önceki arama temizlenir. İlk değerlerin etiketleri henüz yüklenmemişse, çoklu seçimde geçici olarak değer gösterilir.

```tsx
const [userSearch, setUserSearch] = useState('');
// userSearch, servisin PagedRequest filtresini oluşturmak için kullanılır.

<CustomSelect
  key={form.key('UserId')}
  {...form.getInputProps('UserId')}
  data={userOptions}
  searchable
  clearable
  onSearch={setUserSearch}
/>;
```

`onSearchChange` Mantine'in anlık arama olayı olarak korunur; servis çağrıları için `onSearch` kullanılır.

Talep filtresi `components/request-filter/modal/Modal_RequestFilter` içinde açılan
`RequestFilterPanel` tarafından yönetilir. Panel kapanınca kaldırıldığı için
uygulanmamış seçimler ve bekleyen arama bir sonraki açılışa taşınmaz.

Talep filtresi panelinde ve rapor filtresi menüsünde seçim alanları `defaultValue` ve `onChange` ile bağlanır;
`value` veya `searchValue` verilmez. Filtre taslağı dışarıdan değiştirildiğinde alanların
`key` değeri yenilenir. Normal seçimlerde ve arama sonuçları geldiğinde bu anahtar
değişmez; dropdown ve odak korunur. Sıfırlama ve kayıtlı filtre yükleme sırasında
eski arama filtresi de temizlenir.
