import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    image: require('../../assets/charging_station1.png'),
    title: 'Şarj İstasyonlarını Keşfedin',
    description: 'Türkiye\'nin dört bir yanındaki şarj istasyonlarını tek bir uygulama üzerinden kolayca bulun. Elektrikli aracınız için en uygun şarj noktasını seçin ve yolculuğunuzu güvenle planlayın.',
  },
  {
    id: '2',
    image: require('../../assets/charging_station2.png'),
    title: 'Anlık Bilgiler ve Rezervasyon',
    description: 'İstasyonların doluluk durumu, şarj tipi ve güç seviyeleri hakkında gerçek zamanlı bilgilere ulaşın. Önceden rezervasyon yaparak sıra beklemeden şarj edin. Favori istasyonlarınızı kaydedin ve düzenli kullanın.',
  },
  {
    id: '3',
    image: require('../../assets/charging_car1.png'),
    title: 'Akıllı Rota Planlaması',
    description: 'Uzun yolculuklarınızda şarj durakları ile optimize edilmiş rotalar oluşturun. Mola noktalarındaki restoran, kafe gibi hizmetleri görüntüleyin. Şarj sürenizi verimli değerlendirin.',
  },
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef(null);

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    setCurrentIndex(viewableItems[0]?.index ?? 0);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.replace('Login');
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.imageContainer}>
          <Image source={item.image} style={styles.image} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const skipToLogin = () => {
    navigation.replace('Login');
  };

  const continueWithoutSignup = () => {
    navigation.replace('Home');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <TouchableOpacity style={styles.skipButton} onPress={skipToLogin}>
        <Text style={styles.skipText}>Geç</Text>
      </TouchableOpacity>
      
      <FlatList
        data={slides}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
      />
      
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.button,
            currentIndex === slides.length - 1 && styles.getStartedButton
          ]} 
          onPress={scrollTo}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? 'Hemen Başla' : 'İleri'}
          </Text>
        </TouchableOpacity>
        
        {currentIndex === slides.length - 1 && (
          <TouchableOpacity 
            style={styles.anonymousButton} 
            onPress={continueWithoutSignup}
          >
            <Text style={styles.anonymousButtonText}>Üye Olmadan Devam Et</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width * 0.8,
    height: height * 0.4,
    resizeMode: 'contain',
  },
  textContainer: {
    flex: 0.4,
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    paddingHorizontal: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  indicator: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 5,
  },
  activeIndicator: {
    backgroundColor: COLORS.primary,
    width: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  getStartedButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  skipText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: '500',
  },
  anonymousButton: {
    marginTop: 14,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    alignItems: 'center',
  },
  anonymousButtonText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default OnboardingScreen; 